// PHQ-9 (Spitzer, Williams, Kroenke and colleagues): "No permission required to reproduce, translate,
// display or distribute." Cut-off 10 from Kroenke, Spitzer and Williams, J Gen Intern Med 2001.
export const PHQ9_CUTOFF = 10;

export interface Phq9Result {
  total: number;
  aboveCutoff: boolean;
  // Question 9 asks about thoughts of being better off dead or of self-harm.
  selfHarm: boolean;
}

export function score(answers: number[]): Phq9Result {
  if (answers.length !== 9 || answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) {
    throw new Error('PHQ-9 needs nine answers from 0 to 3');
  }
  const total = answers.reduce((sum, a) => sum + a, 0);
  return { total, aboveCutoff: total >= PHQ9_CUTOFF, selfHarm: (answers[8] ?? 0) > 0 };
}
