import { z } from 'zod';

// Cut-off used in the 2026 Philippine BMJ Open study (spec section 8).
export const EPDS_CUTOFF = 13;

const AnswersSchema = z.array(z.number().int().min(0).max(3)).length(10);

export function score(answers: number[]): { total: number; selfHarm: boolean } {
  const a = AnswersSchema.parse(answers);
  return { total: a.reduce((sum, n) => sum + n, 0), selfHarm: (a[9] ?? 0) > 0 };
}
