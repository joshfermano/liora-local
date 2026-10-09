import { useCallback, useEffect, useRef, useState } from 'react';
import { modelBytesOnDisk, voiceBytesOnDisk } from '../../ai/gemma-native';
import { MIC_DENIED, useVoiceNote } from '../../ai/use-voice-note';
import { en } from '../../content/copy';
import type { ReplyBlock } from '../../core/companion';
import { useCompanionStore } from '../../store/companion';
import { useLogStore } from '../../store/log';
import { agentStore } from '../companion/agent-store';
import { savedLine } from '../companion/saved';
import { installedVoices, Speech } from './speech';
import { resolveVoice } from './voice';


export type LivePhase = 'starting' | 'listening' | 'thinking' | 'speaking' | 'setup' | 'retry' | 'mic';

const fill = (s: string, v: Record<string, string> = {}) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

// Only the reply line (or its fixed fallback), her own saved data and one fixed sentence for a source card
// are spoken; a decision is read on the result screen and a card's words are not read aloud.
function spoken(blocks: ReplyBlock[]): string {
  const lead =
    blocks.find((b) => b.kind === 'reply') ?? blocks.find((b) => b.kind === 'warm') ?? blocks.find((b) => b.kind === 'text');
  const parts: string[] = [];
  if (lead?.kind === 'reply') parts.push(lead.text ?? fill(en(lead.fallback.key), lead.fallback.params));
  else if (lead?.kind === 'warm') parts.push(lead.text ?? en(`warm.${lead.tone}`));
  else if (lead?.kind === 'text') parts.push(fill(en(lead.key), lead.params));
  for (const b of blocks) if (b.kind === 'logged') parts.push(...b.items.map(savedLine));
  if (blocks.some((b) => b.kind === 'card')) parts.push(en('reply.card_spoken'));
  return parts.join(' ');
}

type Heard = { text: string; ms: number } | null;

const ACKS = ['live.ack.1', 'live.ack.2', 'live.ack.3'];

// Her chosen voice from Profile while it is installed, else the best English woman's voice.
async function bestVoice(): Promise<string | undefined> {
  const chosen = useLogStore.getState().setup?.voice;
  return resolveVoice(await installedVoices(), typeof chosen === 'string' ? chosen : undefined);
}

// href is set when the decision needs its own screen; Live then closes and opens it.
export function useLive(onDecision: (href?: string) => void) {
  const heardRef = useRef<(heard: Heard) => void>(() => {});
  const voice = useVoiceNote({ autoStop: true, onHeard: (heard) => heardRef.current(heard) });
  // The hook's functions read its state from the render that made them, so always call the latest.
  const latest = useRef(voice);
  latest.current = voice;
  const [phase, setPhase] = useState<LivePhase>('starting');
  const [output, setOutput] = useState(0);
  const alive = useRef(true);

  const listen = useCallback(async () => {
    if (!alive.current) return;
    if (modelBytesOnDisk() <= 0 || voiceBytesOnDisk() <= 0) return setPhase('setup');
    try {
      await latest.current.start();
      if (alive.current) setPhase('listening');
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      if (__DEV__) console.warn(`[live] could not start recording: ${why}`);
      if (alive.current) setPhase(why === MIC_DENIED ? 'mic' : 'retry');
    }
  }, []);

  const speak = useCallback(async (text: string, then: () => void) => {
    if (!Speech) return then();
    setPhase('speaking');
    const voiceId = await bestVoice();
    if (!alive.current) return;
    const back = () => {
      setOutput(0);
      then();
    };
    // Each spoken word lifts the orb; the decay below lets it fall between words.
    Speech.speak(text, { language: 'en-US', voice: voiceId, rate: 0.95, onBoundary: () => setOutput(0.9), onDone: back, onStopped: back, onError: back });
  }, []);

  // The moment her turn ends, a short fixed acknowledgement plays while Gemma works, so a pause is answered at once.
  const acks = useRef(0);
  useEffect(() => {
    if (voice.state !== 'transcribing' || phase !== 'listening') return;
    setPhase('thinking');
    if (!Speech) return;
    const line = en(ACKS[acks.current++ % ACKS.length]!);
    void bestVoice().then((voiceId) => {
      if (alive.current) Speech?.speak(line, { language: 'en-US', voice: voiceId, rate: 1 });
    });
  }, [voice.state, phase]);

  const handle = useCallback(
    async (heard: Heard) => {
      if (!alive.current) return;
      if (!heard) return setPhase('retry');
      setPhase('thinking');
      await agentStore().send(heard.text, 'voice');
      if (!alive.current) return;
      const reply = [...useCompanionStore.getState().messages].reverse().find((m) => m.role === 'liora');
      const blocks = reply?.blocks ?? [];
      const decision = blocks.find((b): b is Extract<ReplyBlock, { kind: 'decision' }> => b.kind === 'decision');
      if (decision?.level === 'go_now') {
        return void speak(`${en('go.headline')}. ${en('go.line')}`, () => onDecision(`/result/${decision.entryId}`));
      }
      if (decision?.level === 'go_soon') {
        return void speak(en('soon.headline'), () => onDecision(`/result/${decision.entryId}`));
      }
      if (decision?.level === 'follow_up') {
        return void speak(en('followup.comfort'), () => onDecision(`/result/${decision.entryId}`));
      }
      if (decision) return onDecision();
      const text = spoken(blocks);
      if (text) void speak(text, () => void listen());
      else void listen();
    },
    [listen, speak, onDecision],
  );
  heardRef.current = (heard) => void handle(heard);

  const finish = useCallback(async () => {
    setPhase('thinking');
    await handle(await latest.current.stop());
  }, [handle]);

  const tapOrb = useCallback(() => {
    if (phase === 'listening') void finish();
    else if (phase === 'speaking') void Speech?.stop();
    else if (phase === 'retry' || phase === 'mic') void listen();
  }, [phase, finish, listen]);

  useEffect(() => {
    if (phase !== 'speaking') return;
    const t = setInterval(() => setOutput((o) => (o < 0.02 ? 0 : o * 0.72)), 90);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(
    () => () => {
      alive.current = false;
      void Speech?.stop();
      void latest.current.cancel();
    },
    [],
  );

  return { phase, input: voice.level, output, listen, tapOrb };
}
