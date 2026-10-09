import { DANGER_CODES } from './vocabulary';
import type { Severity } from './types';

export interface FollowUp {
  question_id: string;
  code: string;
}

// Question wording is human-written in src/content/ (LUM-47), keyed by question_id.
export const FOLLOW_UPS: FollowUp[] = DANGER_CODES.filter((c) => c.startsWith('severe_')).map(
  (code) => ({ question_id: `fu.${code}`, code }),
);

export type Answer = 'yes' | 'no' | 'skip';

export function applyAnswer(answer: Answer): Severity {
  return answer === 'no' ? 'mild' : 'severe';
}

// Signs she is asked about in the same words ("Sobrang sakit ba?"): one answer covers them all, so she is
// never asked the same question twice in a row. Wording lives in src/content/; this only groups the codes.
const SAME_QUESTION: readonly (readonly string[])[] = [['severe_headache', 'severe_pain', 'severe_abdominal_pain']];

export function askedTogether(code: string): readonly string[] {
  return SAME_QUESTION.find((group) => group.includes(code)) ?? [code];
}
