import type { LoadTarget } from './protocol';

export type GemmaDtype = { embed_tokens: string; decoder_model_merged: string };

export type GemmaDevice = { embed_tokens: 'wasm'; decoder_model_merged: 'webgpu' };

export type ModelSpec =
  | { kind: 'gemma4'; repo: string; dtype: GemmaDtype; device: GemmaDevice }
  | { kind: 'embedding'; repo: string; dtype: string };

// The iPhone's WebGPU caps one buffer at 1,024 MB, and Gemma 4's per-layer embedding table is
// 1,120 MB (2,240 MB as int8), so the token embeddings run on the CPU; the lookup is cheap there.
const GEMMA_DEVICE: GemmaDevice = { embed_tokens: 'wasm', decoder_model_merged: 'webgpu' };

// Transformers.js file suffixes: q8 -> "_quantized", q4f16 -> "_q4f16", q2f16 -> "_q2f16".
export function specFor(target: LoadTarget): ModelSpec {
  switch (target.model) {
    case 'gemma4-q4f16':
      return {
        kind: 'gemma4',
        repo: 'onnx-community/gemma-4-E2B-it-ONNX',
        dtype: {
          embed_tokens: target.embeddings === 'quantized' ? 'q8' : 'q4f16',
          decoder_model_merged: 'q4f16',
        },
        device: GEMMA_DEVICE,
      };
    case 'gemma4-qat-mobile':
      return {
        kind: 'gemma4',
        repo: 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
        dtype: { embed_tokens: 'q2f16', decoder_model_merged: 'q2f16' },
        device: GEMMA_DEVICE,
      };
    case 'embeddinggemma2-text':
      return { kind: 'embedding', repo: 'onnx-community/embeddinggemma-2-ONNX', dtype: 'q4f16' };
  }
}
