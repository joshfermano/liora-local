// Shared by use-voice-note.ts (web) and use-voice-note.native.ts; neither may import the other.
export type VoiceNoteState = 'idle' | 'recording' | 'transcribing' | 'error';

export type VoiceNote = {
  state: VoiceNoteState;
  seconds: number;
  error: string | null;
  start(): Promise<void>;
  // Resolves to her words as text, or null when nothing could be heard or transcribed.
  stop(): Promise<{ text: string; ms: number } | null>;
};
