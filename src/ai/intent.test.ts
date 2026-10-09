import { describe, expect, it } from 'vitest';
import { INTENT_OPTIONS, intentPrompt, pickIntent } from './intent';

describe('what Gemma says her message is about', () => {
  it('asks one lettered choice question about her own words', () => {
    const prompt = intentPrompt('ano ba dapat kainin');
    expect(prompt).toContain('"ano ba dapat kainin"');
    for (const letter of INTENT_OPTIONS) expect(prompt).toContain(`${letter.toUpperCase()})`);
  });

  it('takes the clear winner', () => {
    expect(pickIntent([0.05, 0.05, 0.05, 0.05, 0.7, 0.05, 0.05])).toBe('health_question');
  });

  it('gives no answer when Gemma is unsure, so the rules keep their reading', () => {
    expect(pickIntent([0.3, 0.3, 0.1, 0.1, 0.1, 0.05, 0.05])).toBeNull();
  });

  it('never lets Gemma call a message a symptom; only the word list and typed decisions find those', () => {
    expect(pickIntent([0.9, 0.02, 0.02, 0.02, 0.02, 0.01, 0.01])).toBeNull();
  });
});
