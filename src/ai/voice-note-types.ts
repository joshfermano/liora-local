// Shared by use-voice-note.ts (web) and use-voice-note.native.ts; neither may import the other.
// Thrown by start() when iOS refuses the microphone, so callers can point her to Settings.
export const MIC_DENIED = 'Microphone permission was not given';

export type VoiceNoteState = 'idle' | 'recording' | 'transcribing' | 'error';

export type VoiceNote = {
  state: VoiceNoteState;
  seconds: number;
  // Her voice's loudness right now, 0 to 1, while recording.
  level: number;
  error: string | null;
  start(): Promise<void>;
  // Stops and throws the recording away without transcribing it.
  cancel(): Promise<void>;
  // Resolves to her words as text, or null when nothing could be heard or transcribed.
  stop(): Promise<{ text: string; ms: number } | null>;
};

export type VoiceNoteOptions = {
  // Stop by itself when she goes quiet; the result then goes to onHeard.
  autoStop?: boolean;
  onHeard?: (heard: { text: string; ms: number } | null) => void;
};
