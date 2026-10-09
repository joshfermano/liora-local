import { describe, expect, it } from 'vitest';
import { PHQ9_CUTOFF, score } from './score';

describe('PHQ-9 score', () => {
  it('uses the cut-off of 10 (Kroenke, Spitzer and Williams 2001)', () => {
    expect(PHQ9_CUTOFF).toBe(10);
  });

  it('adds the nine answers', () => {
    expect(score([1, 2, 3, 0, 1, 2, 0, 1, 0]).total).toBe(10);
  });

  it('marks a total at or above the cut-off', () => {
    expect(score([1, 2, 3, 0, 1, 2, 0, 1, 0]).aboveCutoff).toBe(true);
    expect(score([1, 1, 1, 1, 1, 1, 1, 2, 0]).aboveCutoff).toBe(false);
  });

  it('opens the crisis path on any answer to question 9 above "Not at all", whatever the total', () => {
    expect(score([0, 0, 0, 0, 0, 0, 0, 0, 1])).toMatchObject({ total: 1, selfHarm: true });
    expect(score([0, 0, 0, 0, 0, 0, 0, 0, 0]).selfHarm).toBe(false);
  });

  it('refuses anything but nine answers from 0 to 3', () => {
    expect(() => score([0, 1, 2])).toThrow();
    expect(() => score([0, 0, 0, 0, 0, 0, 0, 0, 4])).toThrow();
    expect(() => score([0, 0, 0, 0, 0, 0, 0, 0, 0.5])).toThrow();
  });
});
