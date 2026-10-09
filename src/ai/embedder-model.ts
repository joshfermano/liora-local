// Shared by embedder.ts (web stub) and embedder.native.ts; neither may import the other.
// EmbeddingGemma 300M: llama.rn 0.13.0-rc.7 knows `gemma-embedding`, not EmbeddingGemma 2's `gemma-embedding2`.
export const EMBEDDER_GGUF = {
  url: 'https://huggingface.co/ggml-org/embeddinggemma-300M-qat-q4_0-GGUF/resolve/main/embeddinggemma-300M-qat-Q4_0.gguf',
  file: 'embeddinggemma-300M-qat-Q4_0.gguf',
};

export type Embedder = {
  embed(text: string): Promise<number[]>;
  release(): Promise<void>;
};
