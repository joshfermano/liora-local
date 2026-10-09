// Shared by gemma-native.ts (web stub) and gemma-native.native.ts; neither may import the other.
export const GEMMA_GGUF = {
  url: 'https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_0.gguf',
  file: 'gemma-4-E2B-it-Q4_0.gguf',
};

// Gemma 4's own audio encoder (clip.has_audio_encoder, projector gemma4a): her voice to her words.
export const GEMMA_VOICE = {
  url: 'https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF/resolve/main/mmproj-gemma-4-E2B-it-Q8_0.gguf',
  file: 'mmproj-gemma-4-E2B-it-Q8_0.gguf',
};

// What an entry records when Gemma answered its questions.
export const GEMMA_MODEL_REF = {
  role: 'llm' as const,
  id: 'gemma-4-E2B-it Q4_0 (ggml-org/gemma-4-E2B-it-GGUF)',
  version: 'llama.rn 0.13.0-rc.7',
};

export type NativeGemma = {
  loadMs: number;
  gpu: boolean;
  reasonNoGPU: string;
  voice: boolean;
  transcribe(wavUri: string): Promise<{ text: string; ms: number }>;
  decide(message: string): Promise<{ answers: Record<string, number[]>; skipped: string[]; ms: number }>;
  intent(message: string): Promise<{ probs: number[]; ms: number }>;
  release(): Promise<void>;
};
