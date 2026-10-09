import type { VoiceNote } from './voice-note-types';

export type { VoiceNote, VoiceNoteState } from './voice-note-types';

const unavailable = 'Voice works in the iPhone app';

export function useVoiceNote(): VoiceNote {
  return {
    state: 'error',
    seconds: 0,
    error: unavailable,
    start: () => Promise.reject(new Error(unavailable)),
    stop: () => Promise.resolve(null),
  };
}
