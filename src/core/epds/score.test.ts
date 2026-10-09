import { describe, expect, it } from 'vitest';
import { EPDS_CUTOFF, score } from './score';

const zeros = () => Array<number>(10).fill(0);

describe('epds score', () => {
  it('exports the cut-off 13', () => {
    expect(EPDS_CUTOFF).toBe(13);
  });
  it('sums the ten answers', () => {
    expect(score([1, 2, 3, 0, 1, 2, 3, 0, 1, 0])).toEqual({ total: 13, selfHarm: false });
  });
  it('reaches the extremes 0 and 30', () => {
    expect(score(zeros())).toEqual({ total: 0, selfHarm: false });
    expect(score(Array<number>(10).fill(3))).toEqual({ total: 30, selfHarm: true });
  });
  it('flags self-harm when item 10 is above zero, whatever the total', () => {
    const a = zeros();
    a[9] = 1;
    expect(score(a)).toEqual({ total: 1, selfHarm: true });
  });
  it('does not flag self-harm from other items', () => {
    const a = Array<number>(10).fill(3);
    a[9] = 0;
    expect(score(a).selfHarm).toBe(false);
  });
  it('rejects the wrong number of answers', () => {
    expect(() => score([0, 0, 0])).toThrow();
    expect(() => score([...zeros(), 0])).toThrow();
  });
  it('rejects answers outside 0 to 3 or not whole numbers', () => {
    for (const bad of [-1, 4, 1.5, Number.NaN]) {
      const a = zeros();
      a[4] = bad;
      expect(() => score(a)).toThrow();
    }
  });
});
