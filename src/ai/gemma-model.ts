// Shared by gemma-native.ts (web stub) and gemma-native.native.ts; neither may import the other.
export const GEMMA_GGUF = {
  url: 'https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_0.gguf',
  file: 'gemma-4-E2B-it-Q4_0.gguf',
};

export type NativeGemma = {
  loadMs: number;
  gpu: boolean;
  reasonNoGPU: string;
  decide(message: string): Promise<{ answers: Record<string, number[]>; skipped: string[]; ms: number }>;
  release(): Promise<void>;
};
