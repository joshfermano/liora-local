import type { NativeGemma } from './gemma-model';

export { GEMMA_GGUF, GEMMA_VOICE, type NativeGemma } from './gemma-model';

const unavailable = () => Promise.reject(new Error('Gemma 4 runs natively only in the iPhone app'));

export function modelBytesOnDisk(): number {
  return 0;
}

export function downloadModel(_onProgress: (written: number, total: number) => void): Promise<void> {
  return unavailable();
}

export function voiceBytesOnDisk(): number {
  return 0;
}

export function downloadVoice(_onProgress: (written: number, total: number) => void): Promise<void> {
  return unavailable();
}

export function loadGemma(): Promise<NativeGemma> {
  return unavailable();
}
