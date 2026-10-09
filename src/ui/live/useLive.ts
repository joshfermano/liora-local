import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { modelBytesOnDisk, voiceBytesOnDisk } from '../../ai/gemma-native';
import { useVoiceNote } from '../../ai/use-voice-note';
import { en } from '../../content/copy';
import type { ReplyBlock } from '../../core/companion';
import { useCompanionStore } from '../../store/companion';

export type LivePhase = 'starting' | 'listening' | 'thinking' | 'speaking' | 'setup' | 'retry';

const fill = (s: string, v: Record<string, string> = {}) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

// Only Liora's fixed sentences are spoken; anything with a decision goes back to the chat to be read in full.
function spoken(blocks: ReplyBlock[]): string {
  return blocks
    .filter((b): b is Extract<ReplyBlock, { kind: 'text' }> => b.kind === 'text')
    .map((b) => fill(en(b.key), b.params))
    .join(' ');
}

export function useLive(onDecision: () => void) {
  const voice = useVoiceNote();
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
    } catch {
      setPhase('retry');
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      setPhase('speaking');
      const back = () => {
        setOutput(0);
        void listen();
      };
      // Each spoken word lifts the orb; the decay below lets it fall between words.
      Speech.speak(text, { language: 'en-US', onBoundary: () => setOutput(0.9), onDone: back, onStopped: back, onError: back });
    },
    [listen],
  );

  const finish = useCallback(async () => {
    setPhase('thinking');
    const heard = await latest.current.stop();
    if (!alive.current) return;
    if (!heard) return setPhase('retry');
    await useCompanionStore.getState().send(heard.text);
    if (!alive.current) return;
    const reply = [...useCompanionStore.getState().messages].reverse().find((m) => m.role === 'liora');
    const blocks = reply?.blocks ?? [];
    if (blocks.some((b) => b.kind === 'decision')) return onDecision();
    const text = spoken(blocks);
    if (text) speak(text);
    else void listen();
  }, [listen, speak, onDecision]);

  const tapOrb = useCallback(() => {
    if (phase === 'listening') void finish();
    else if (phase === 'speaking') void Speech.stop();
    else if (phase === 'retry') void listen();
  }, [phase, finish, listen]);

  useEffect(() => {
    if (phase !== 'speaking') return;
    const t = setInterval(() => setOutput((o) => (o < 0.02 ? 0 : o * 0.72)), 90);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(
    () => () => {
      alive.current = false;
      void Speech.stop();
      void latest.current.cancel();
    },
    [],
  );

  return { phase, input: voice.level, output, listen, tapOrb };
}
