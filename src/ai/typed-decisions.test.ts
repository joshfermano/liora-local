import { describe, expect, it } from 'vitest';
import { DANGER_CODES } from '../core/vocabulary';
import {
  followUpQuestions,
  PRESENCE,
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
  it('asks one presence question per WHO danger code', () => {
    expect(PRESENCE.map((q) => q.code)).toEqual([...DANGER_CODES]);
  });

  it('asks "very bad?" and "only mild or moderate?" for every code that needs a severe answer', () => {
    const severe = DANGER_CODES.filter((c) => c.startsWith('severe_'));
    expect(QUESTIONS.filter((q) => q.id.startsWith('severe.')).map((q) => q.code)).toEqual(severe);
    expect(QUESTIONS.filter((q) => q.id.startsWith('mild.')).map((q) => q.code)).toEqual(severe);
  });

  it('asks only yes/no questions', () => {
    expect(QUESTIONS.every((q) => q.options.join() === 'yes,no')).toBe(true);
  });

  // On the phone, "masakit ulo ko" got yes 0.60 to "looks or feels very ill".
  it('asks whether the message itself says she is very ill, not whether anything hurts', () => {
    expect(PRESENCE.find((q) => q.code === 'looks_very_ill')?.text).toMatch(/not just that something hurts/);
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

describe('followUpQuestions', () => {
  const yes = (p: number) => [p, 1 - p];

  it('asks how bad it is only for the signs her message mentions', () => {
    const ids = followUpQuestions({ 'yesno.severe_headache': yes(0.9), 'yesno.severe_pain': yes(0.1) }, T).map((q) => q.id);
    expect(ids).toEqual(['severe.severe_headache', 'mild.severe_headache']);
  });

  it('asks nothing more when no sign that needs a severity is mentioned', () => {
    expect(followUpQuestions({ 'yesno.fever': yes(0.95) }, T)).toEqual([]);
  });
});

describe('toFindings', () => {
  const yes = (p: number) => [p, 1 - p];

  it('adds a presence-only danger code when the answer is a confident yes', () => {
    expect(toFindings({ 'yesno.vaginal_bleeding': yes(0.9) }, T)).toEqual([
      { code: 'vaginal_bleeding', severity: 'unknown', sources: ['llm'], confidence: 0.9 },
    ]);
  });

  it('adds nothing below the low threshold', () => {
    expect(toFindings({ 'yesno.vaginal_bleeding': yes(0.1) }, T)).toEqual([]);
  });

  it('takes a confident "very bad" as severe', () => {
    const found = toFindings({ 'yesno.severe_headache': yes(0.9), 'severe.severe_headache': yes(0.8), 'mild.severe_headache': yes(0.1) }, T);
    expect(found[0]?.severity).toBe('severe');
  });

  it('takes a confident "only mild or moderate" as moderate', () => {
    const found = toFindings({ 'yesno.severe_pain': yes(0.97), 'severe.severe_pain': yes(0.05), 'mild.severe_pain': yes(0.9) }, T);
    expect(found[0]?.severity).toBe('moderate');
  });

  it('asks when the message does not say how bad it is', () => {
    const found = toFindings({ 'yesno.severe_headache': yes(0.99), 'severe.severe_headache': yes(0.05), 'mild.severe_headache': yes(0.1) }, T);
    expect(found[0]?.severity).toBe('unknown');
  });

  it('asks when "very bad" is possible, even if "mild" is likely', () => {
    const found = toFindings({ 'yesno.severe_headache': yes(0.9), 'severe.severe_headache': yes(0.3), 'mild.severe_headache': yes(0.9) }, T);
    expect(found[0]?.severity).toBe('unknown');
  });

  // On the phone, "konting sakit lang ng ulo ko" got pain 0.41 with "only mild" 0.86 and asked anyway.
  it('takes a confident "only mild or moderate" even when the sign itself is uncertain', () => {
    const found = toFindings({ 'yesno.severe_pain': yes(0.41), 'severe.severe_pain': yes(0.01), 'mild.severe_pain': yes(0.86) }, T);
    expect(found[0]?.severity).toBe('moderate');
  });

  it('asks when the yes itself is uncertain', () => {
    const found = toFindings({ 'yesno.severe_headache': yes(0.4), 'severe.severe_headache': yes(1), 'mild.severe_headache': yes(0) }, T);
    expect(found[0]?.severity).toBe('unknown');
  });
});
