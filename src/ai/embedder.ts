import type { Embedder } from './embedder-model';

export { EMBEDDER_GGUF, type Embedder } from './embedder-model';

const unavailable = () => Promise.reject(new Error('Card search runs only in the iPhone app'));

export function embedderBytesOnDisk(): number {
  return 0;
}

export function downloadEmbedder(_onProgress: (written: number, total: number) => void): Promise<void> {
  return unavailable();
}

export function loadEmbedder(): Promise<Embedder> {
  return unavailable();
}
