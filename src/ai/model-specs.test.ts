import { describe, expect, it } from 'vitest';
import { specFor } from './model-specs';

describe('specFor', () => {
  it('maps Gemma 4 q4f16 with quantized token embeddings', () => {
    expect(specFor({ model: 'gemma4-q4f16', embeddings: 'quantized' })).toEqual({
      kind: 'gemma4',
      repo: 'onnx-community/gemma-4-E2B-it-ONNX',
      dtype: { embed_tokens: 'q8', decoder_model_merged: 'q4f16' },
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
    });
  });

  it('maps the EmbeddingGemma 2 text model', () => {
    expect(specFor({ model: 'embeddinggemma2-text' })).toEqual({
      kind: 'embedding',
      repo: 'onnx-community/embeddinggemma-2-ONNX',
      dtype: 'q4f16',
    });
  });
});
