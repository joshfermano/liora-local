import { z } from 'zod';
import { DangerCodeSchema, DecisionSchema, type DangerCode, type Entry } from '../core/types';

// eval/cases.json: phrases written by the team and never used to tune wording or thresholds.
const CaseSchema = z.object({
  id: z.string(),
  text: z.string(),
  expectLevel: DecisionSchema.shape.level,
  expectCodes: z.array(DangerCodeSchema),
});
export type EvalCase = z.infer<typeof CaseSchema>;

export function parseCases(raw: unknown): EvalCase[] {
  return z.array(CaseSchema).parse(raw);
}

export interface EvalReport {
  cases: number;
  levelMatched: number;
  // A case the rules should send to hospital that came out as a calm answer; must stay empty.
  dangerMissed: string[];
  recall: Partial<Record<DangerCode, { found: number; expected: number }>>;
}

export function scoreRun(results: { case: EvalCase; entry: Entry }[]): EvalReport {
  const report: EvalReport = { cases: results.length, levelMatched: 0, dangerMissed: [], recall: {} };
  for (const { case: c, entry } of results) {
    if (entry.decision.level === c.expectLevel) report.levelMatched++;
    if (c.expectLevel === 'go_now' && entry.decision.level === 'ok') report.dangerMissed.push(c.id);
    const found = new Set(entry.findings.map((f) => f.code));
    for (const code of c.expectCodes) {
      const r = (report.recall[code] ??= { found: 0, expected: 0 });
      r.expected++;
      if (found.has(code)) r.found++;
    }
  }
  return report;
}
