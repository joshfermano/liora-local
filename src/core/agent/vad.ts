import type { VadState } from './types';

// Her voice is measured against the room, not a fixed level: close speech stands well above chatter
// across the room, so the drop when she stops is heard even where the room never goes quiet.
const SPEECH_ABOVE_DB = 12;
const QUIET_WITHIN_DB = 6;
const SPEECH_START_MS = 300;
const SILENCE_END_MS = 700;
const MAX_SPEECH_MS = 30_000;
const ROOM_WINDOW_MS = 3000;
// The recorder reports about -160 dB before it has a real reading.
const NO_READING_DB = -120;

// Silence detection over the recorder's metering (dBFS), one sample every 100 ms.
export interface Vad {
  push(db: number, atMs: number): VadState;
  reset(): void;
}

export function createVad(): Vad {
  let state: VadState = 'waiting';
  let loudSince: number | null = null;
  let quietSince: number | null = null;
  // The room's level is learned only while waiting, so her own voice never becomes the room.
  let room: { db: number; atMs: number }[] = [];
  const floor = () => Math.min(...room.map((r) => r.db));
  return {
    push(db, atMs) {
      if (state === 'end' || db <= NO_READING_DB) return state;
      if (state === 'waiting') {
        room = room.filter((r) => atMs - r.atMs <= ROOM_WINDOW_MS);
        const loud = room.length > 0 && db > floor() + SPEECH_ABOVE_DB;
        room.push({ db, atMs });
        if (!loud) {
          loudSince = null;
        } else {
          loudSince ??= atMs;
          if (atMs - loudSince >= SPEECH_START_MS) state = 'speech';
        }
        return state;
      }
      quietSince = db < floor() + QUIET_WITHIN_DB ? (quietSince ?? atMs) : null;
      if (quietSince !== null && atMs - quietSince >= SILENCE_END_MS) state = 'end';
      else if (atMs - (loudSince ?? atMs) >= MAX_SPEECH_MS) state = 'end';
      return state;
    },
    reset() {
      state = 'waiting';
      loudSince = null;
      quietSince = null;
      room = [];
    },
  };
}
