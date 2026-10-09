import type { VadState } from './types';

const SPEECH_DB = -35;
const SILENCE_DB = -45;
const SPEECH_START_MS = 300;
const SILENCE_END_MS = 1200;
const MAX_SPEECH_MS = 30_000;

// Silence detection over the recorder's metering (dBFS), one sample every 100 ms.
export interface Vad {
  push(db: number, atMs: number): VadState;
  reset(): void;
}

export function createVad(): Vad {
  let state: VadState = 'waiting';
  let loudSince: number | null = null;
  let quietSince: number | null = null;
  return {
    push(db, atMs) {
      if (state === 'end') return state;
      if (state === 'waiting') {
        if (db <= SPEECH_DB) {
          loudSince = null;
        } else {
          loudSince ??= atMs;
          if (atMs - loudSince >= SPEECH_START_MS) state = 'speech';
        }
        return state;
      }
      quietSince = db < SILENCE_DB ? (quietSince ?? atMs) : null;
      if (quietSince !== null && atMs - quietSince >= SILENCE_END_MS) state = 'end';
      else if (atMs - (loudSince ?? atMs) >= MAX_SPEECH_MS) state = 'end';
      return state;
    },
    reset() {
      state = 'waiting';
      loudSince = null;
      quietSince = null;
    },
  };
}
