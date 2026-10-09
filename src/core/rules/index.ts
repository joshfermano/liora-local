import { FOLLOW_UPS } from '../followups';
import type { Context, Decision, Finding } from '../types';
import type { Rule } from './rule';
import { DT01_RULES, DT17_RULE } from './who';

export type { Rule } from './rule';

// One set for every status, except that vaginal bleeding counts only while pregnant or postpartum (who.ts).
export const RULES: Rule[] = [...DT01_RULES, DT17_RULE];

export function evaluate(findings: Finding[], context: Context): Decision {
  const fired: Decision['fired'] = [];
  let pending: string | undefined;

  for (const rule of RULES) {
    if (rule.when && !rule.when(context)) continue;
    const matched = findings.filter((f) => rule.codes.includes(f.code));
    if (rule.codes.length > 0 && matched.length === 0) continue;

    if (rule.minSeverity) {
      if (matched.some((f) => f.severity === rule.minSeverity)) {
        fired.push({ rule_id: rule.id, codes: matched.map((f) => f.code) });
      } else if (matched.some((f) => f.severity === 'unknown')) {
        pending ??= rule.codes[0];
      }
    } else {
      fired.push({ rule_id: rule.id, codes: matched.map((f) => f.code) });
    }
  }

  if (fired.length > 0) return { level: 'go_now', fired };
  const question = FOLLOW_UPS.find((q) => q.code === pending);
  if (question) return { level: 'follow_up', fired, follow_up: question };
  return { level: 'ok', fired };
}
