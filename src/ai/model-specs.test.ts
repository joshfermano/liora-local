import { describe, expect, it } from 'vitest';
import { specFor } from './model-specs';

describe('specFor', () => {
  it('maps Gemma 4 q4f16 with quantized token embeddings', () => {
    expect(specFor({ model: 'gemma4-q4f16', embeddings: 'quantized' })).toEqual({
      kind: 'gemma4',
      repo: 'onnx-community/gemma-4-E2B-it-ONNX',
      dtype: { embed_tokens: 'q8', decoder_model_merged: 'q4f16' },
      device: { embed_tokens: 'wasm', decoder_model_merged: 'webgpu' },
    });
  });

  it('maps Gemma 4 q4f16 with q4f16 token embeddings', () => {
    expect(specFor({ model: 'gemma4-q4f16', embeddings: 'q4f16' }).dtype).toEqual({
      embed_tokens: 'q4f16',
      decoder_model_merged: 'q4f16',
    });
  });

  it('maps the 2-bit mobile build', () => {
    expect(specFor({ model: 'gemma4-qat-mobile' })).toEqual({
      kind: 'gemma4',
      repo: 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
      dtype: { embed_tokens: 'q2f16', decoder_model_merged: 'q2f16' },
      device: { embed_tokens: 'wasm', decoder_model_merged: 'webgpu' },
    });
  });

  // The iPhone's WebGPU caps one buffer at 1,024 MB; Gemma 4's per-layer embedding table is 1,120 MB.
  it('keeps the oversized token embeddings off the GPU in every Gemma 4 build', () => {
    for (const target of [
      { model: 'gemma4-q4f16', embeddings: 'q4f16' },
      { model: 'gemma4-q4f16', embeddings: 'quantized' },
      { model: 'gemma4-qat-mobile' },
    ] as const) {
      const spec = specFor(target);
      expect(spec.kind === 'gemma4' && spec.device).toEqual({ embed_tokens: 'wasm', decoder_model_merged: 'webgpu' });
    }
  });

  it('maps the EmbeddingGemma 2 text model', () => {
    expect(specFor({ model: 'embeddinggemma2-text' })).toEqual({
      kind: 'embedding',
      repo: 'onnx-community/embeddinggemma-2-ONNX',
      dtype: 'q4f16',
    });
  });
});
