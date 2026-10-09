import { describe, expect, it } from 'vitest';
import { DANGER_CODES } from '../core/vocabulary';
import {
  QUESTIONS,
  logScoresFromTopProbs,
  optionTokenIds,
  promptFor,
  restrictedSoftmax,
  splitPrefix,
  toFindings,
} from './typed-decisions';

const T = { tauLo: 0.2, tauHi: 0.6 };

describe('restrictedSoftmax', () => {
  it('turns the listed options into probabilities that sum to one', () => {
    const probs = restrictedSoftmax([0, Math.log(2)], [[1], [0]]);
    expect(probs[0]).toBeCloseTo(2 / 3);
    expect(probs[1]).toBeCloseTo(1 / 3);
  });

  it('pools the spelling variants of one option', () => {
    const probs = restrictedSoftmax([0, 0, 0], [[0, 1], [2]]);
    expect(probs[0]).toBeCloseTo(2 / 3);
  });

  it('ignores every token that is not an option', () => {
    const probs = restrictedSoftmax([0, 0, 50], [[0], [1]]);
    expect(probs).toEqual([0.5, 0.5]);
  });

  it('stays finite for large logits', () => {
    const probs = restrictedSoftmax([1000, 1001], [[0], [1]]);
    expect(probs[1]).toBeCloseTo(Math.E / (1 + Math.E));
  });
});

describe('logScoresFromTopProbs', () => {
  it('lets the option softmax read the top-token probabilities a native runtime reports', () => {
    const scores = logScoresFromTopProbs([
      { tok_id: 5, prob: 0.6 },
      { tok_id: 9, prob: 0.2 },
      { tok_id: 3, prob: 0.1 },
    ]);
    const probs = restrictedSoftmax(scores, [[5], [9], [7]]);
    expect(probs[0]).toBeCloseTo(0.75);
    expect(probs[1]).toBeCloseTo(0.25);
    expect(probs[2]).toBe(0);
  });
});

describe('optionTokenIds', () => {
  const vocab: Record<string, number[]> = {
    yes: [1], ' yes': [2], Yes: [3], ' Yes': [4],
    no: [5], ' no': [6], No: [7], ' No': [8],
    unsure: [9, 10], ' unsure': [11], Unsure: [12, 13], ' Unsure': [14, 15],
  };
  const encode = (text: string) => vocab[text] ?? [99, 98];

  it('keeps every single-token spelling of each option', () => {
    expect(optionTokenIds(encode, ['yes', 'no'])).toEqual([[1, 2, 3, 4], [5, 6, 7, 8]]);
  });

  it('drops spellings that need more than one token', () => {
    expect(optionTokenIds(encode, ['unsure'])).toEqual([[11]]);
  });

  it('refuses an option with no single-token spelling', () => {
    expect(() => optionTokenIds(encode, ['maybe'])).toThrow(/maybe/);
  });

  it('refuses two options that share a token', () => {
    const clash = (text: string) => (text.trim().toLowerCase() === 'no' ? [1] : [1]);
    expect(() => optionTokenIds(clash, ['yes', 'no'])).toThrow(/share/);
  });
});

describe('splitPrefix', () => {
  it('shares the longest common start and keeps the rest per question', () => {
    expect(splitPrefix([[1, 2, 3, 4], [1, 2, 5]])).toEqual({ prefix: [1, 2], suffixes: [[3, 4], [5]] });
  });

  it('leaves at least one token in every suffix', () => {
    expect(splitPrefix([[1, 2, 3], [1, 2, 3, 4]])).toEqual({ prefix: [1, 2], suffixes: [[3], [3, 4]] });
  });
});

describe('the question set', () => {
  it('asks one yes/no question per WHO danger code', () => {
    const codes = QUESTIONS.filter((q) => q.kind === 'yesno').map((q) => q.code);
    expect(codes).toEqual([...DANGER_CODES]);
  });

  it('asks how bad it is for every code that needs a severe answer', () => {
    const codes = QUESTIONS.filter((q) => q.kind === 'score').map((q) => q.code);
    expect(codes).toEqual(DANGER_CODES.filter((c) => c.startsWith('severe_')));
  });

  it('gives every question its own id', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });

  it('puts her message before the question so the message part is shared', () => {
    const [a, b] = QUESTIONS.slice(0, 2).map((q) => promptFor('masakit ulo ko', q)) as [string, string];
    const shared = a.slice(0, [...a].findIndex((ch, i) => ch !== b[i]));
    expect(shared).toContain('"masakit ulo ko"');
  });
});

describe('toFindings', () => {
  const yes = (p: number) => [p, 1 - p];
  // mild, moderate, severe, unsure
  const score = (mild: number, moderate: number, severe: number, unsure: number) => [mild, moderate, severe, unsure];

  it('adds a presence-only danger code when the answer is a confident yes', () => {
    expect(toFindings({ 'yesno.vaginal_bleeding': yes(0.9) }, T)).toEqual([
      { code: 'vaginal_bleeding', severity: 'unknown', sources: ['llm'], confidence: 0.9 },
    ]);
  });

  it('adds nothing below the low threshold', () => {
    expect(toFindings({ 'yesno.vaginal_bleeding': yes(0.1) }, T)).toEqual([]);
  });

  it('takes a confident severe score', () => {
    const found = toFindings({ 'yesno.severe_headache': yes(0.9), 'score.severe_headache': score(0.05, 0.05, 0.8, 0.1) }, T);
    expect(found[0]?.severity).toBe('severe');
  });

  it('takes a confident mild score', () => {
    const found = toFindings({ 'yesno.severe_pain': yes(0.8), 'score.severe_pain': score(0.9, 0.05, 0.02, 0.03) }, T);
    expect(found[0]?.severity).toBe('mild');
  });

  it('asks when the message does not say how bad it is', () => {
    const found = toFindings({ 'yesno.severe_headache': yes(0.9), 'score.severe_headache': score(0.1, 0.1, 0.1, 0.7) }, T);
    expect(found[0]?.severity).toBe('unknown');
  });

  it('asks when severe is possible but not the top answer', () => {
    const found = toFindings({ 'yesno.severe_headache': yes(0.9), 'score.severe_headache': score(0.6, 0.05, 0.3, 0.05) }, T);
    expect(found[0]?.severity).toBe('unknown');
  });

  it('asks when the yes itself is uncertain', () => {
    const found = toFindings({ 'yesno.severe_headache': yes(0.4), 'score.severe_headache': score(0, 0, 1, 0) }, T);
    expect(found[0]?.severity).toBe('unknown');
  });
});
