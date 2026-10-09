import { describe, expect, it } from 'vitest';
import { addProgress, describeInflight, formatMB, totals, type Inflight } from './eval-log';

describe('progress totals', () => {
  it('sums the latest figure of every file', () => {
    let files = addProgress({}, { file: 'a', loaded: 10, total: 100 });
    files = addProgress(files, { file: 'b', loaded: 5, total: 50 });
    files = addProgress(files, { file: 'a', loaded: 60, total: 100 });
    expect(totals(files)).toEqual({ loaded: 65, total: 150 });
  });
});

describe('formatMB', () => {
  it('shows megabytes with one decimal', () => {
    expect(formatMB(1_572_864)).toBe('1.5 MB');
  });
});

describe('describeInflight', () => {
  const base: Inflight = {
    label: 'Gemma 4 + EmbeddingGemma 2 together',
    startedAt: 1000,
    step: 'load gemma4-q4f16',
    file: 'decoder_model_merged_q4f16.onnx_data',
    loaded: 500_000_000,
    total: 1_519_700_000,
    updatedAt: 9000,
  };

  it('says what was running when the page came back', () => {
    const text = describeInflight(base);
    expect(text).toContain('Gemma 4 + EmbeddingGemma 2 together');
    expect(text).toContain('load gemma4-q4f16');
    expect(text).toContain('decoder_model_merged_q4f16.onnx_data');
    expect(text).toContain('did not finish');
  });

  it('copes with a run that had no download yet', () => {
    expect(describeInflight({ ...base, file: undefined, loaded: 0, total: 0 })).toContain('did not finish');
  });
});
