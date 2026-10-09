import type { LoadTarget } from './protocol';

export type GemmaDtype = { embed_tokens: string; decoder_model_merged: string };

export type ModelSpec =
  | { kind: 'gemma4'; repo: string; dtype: GemmaDtype }
  | { kind: 'embedding'; repo: string; dtype: string };

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
      };
    case 'gemma4-qat-mobile':
      return {
        kind: 'gemma4',
        repo: 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
        dtype: { embed_tokens: 'q2f16', decoder_model_merged: 'q2f16' },
      };
    case 'embeddinggemma2-text':
      return { kind: 'embedding', repo: 'onnx-community/embeddinggemma-2-ONNX', dtype: 'q4f16' };
  }
}
