import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { modelBytesOnDisk, voiceBytesOnDisk } from '../../ai/gemma-native';
import { MIC_DENIED, useVoiceNote } from '../../ai/use-voice-note';
import { en } from '../../content/copy';
import type { ReplyBlock } from '../../core/companion';
import { useCompanionStore } from '../../store/companion';
import { agentStore } from '../companion/agent-store';
import { savedLine } from '../companion/saved';

type SpeechModule = typeof import('expo-speech');
// An app built before expo-speech must not take the router down with it; Live then just stays silent.
const Speech: SpeechModule | null =
  Platform.OS === 'web' || requireOptionalNativeModule('ExpoSpeech') ? (require('expo-speech') as SpeechModule) : null;

export type LivePhase = 'starting' | 'listening' | 'thinking' | 'speaking' | 'setup' | 'retry' | 'mic';

const fill = (s: string, v: Record<string, string> = {}) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

// Only fixed sentences, her own saved data and the warm line are spoken; a decision is read on the result screen.
function spoken(blocks: ReplyBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.kind === 'text') parts.push(fill(en(b.key), b.params));
    else if (b.kind === 'warm') parts.push(b.text ?? en(`warm.${b.tone}`));
    else if (b.kind === 'logged') parts.push(...b.items.map(savedLine));
  }
  return parts.join(' ');
}

type Heard = { text: string; ms: number } | null;

// The best English voice installed (Enhanced first); undefined lets the system pick.
let voicePick: Promise<string | undefined> | null = null;
function bestVoice(): Promise<string | undefined> {
  voicePick ??= (async () => {
    try {
      const all = (await Speech?.getAvailableVoicesAsync()) ?? [];
      const english = all.filter((v) => v.language.toLowerCase().startsWith('en'));
      const score = (v: (typeof english)[number]) => (v.quality === 'Enhanced' ? 2 : 0) + (v.language.toLowerCase() === 'en-us' ? 1 : 0);
      return english.sort((x, y) => score(y) - score(x))[0]?.identifier;
    } catch {
      return undefined;
    }
  })();
  return voicePick;
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
      if (decision?.level === 'follow_up') return onDecision(`/result/${decision.entryId}`);
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
