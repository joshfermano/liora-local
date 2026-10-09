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

const unavailable = () => Promise.reject(new Error('Gemma 4 runs natively only in the iPhone app'));

export function modelBytesOnDisk(): number {
  return 0;
}

export function downloadModel(_onProgress: (written: number, total: number) => void): Promise<void> {
  return unavailable();
}

export function loadGemma(): Promise<NativeGemma> {
  return unavailable();
}
