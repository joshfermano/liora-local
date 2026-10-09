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
