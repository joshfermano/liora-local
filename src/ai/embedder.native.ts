import { File, Paths } from 'expo-file-system';
import { initLlama } from 'llama.rn';
import { EMBEDDER_GGUF, type Embedder } from './embedder-model';
import { withRetries } from './retry';

export { EMBEDDER_GGUF, type Embedder } from './embedder-model';

const model = () => new File(Paths.document, EMBEDDER_GGUF.file);

export function embedderBytesOnDisk(): number {
  const file = model();
  return file.exists ? (file.size ?? 0) : 0;
}

export async function downloadEmbedder(onProgress: (written: number, total: number) => void): Promise<void> {
  await withRetries(
    () =>
      File.downloadFileAsync(EMBEDDER_GGUF.url, model(), {
        idempotent: true,
        onProgress: ({ bytesWritten, totalBytes }) => onProgress(bytesWritten, totalBytes),
      }),
    { attempts: 3 },
  );
}

export async function loadEmbedder(): Promise<Embedder> {
  const ctx = await initLlama({ model: model().uri, embedding: true, n_ctx: 2048, n_gpu_layers: 99, use_mmap: true });
  return {
    // L2-normalised, so the cosine of two vectors is their dot product.
    embed: async (text) => (await ctx.embedding(text, { embd_normalize: 2 })).embedding,
    release: () => ctx.release(),
  };
}
