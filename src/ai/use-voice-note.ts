import type { VoiceNote, VoiceNoteOptions } from './voice-note-types';

export type { VoiceNote, VoiceNoteOptions, VoiceNoteState } from './voice-note-types';

const unavailable = 'Voice works in the iPhone app';

export function useVoiceNote(_options: VoiceNoteOptions = {}): VoiceNote {
  return {
    state: 'error',
    seconds: 0,
    level: 0,
    error: unavailable,
    start: () => Promise.reject(new Error(unavailable)),
    cancel: () => Promise.resolve(),
    stop: () => Promise.resolve(null),
  };
}
