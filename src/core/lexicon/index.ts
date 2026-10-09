import type { Finding, Mood, Severity } from '../types';
import { ENTRIES, MILD_CUE, MOOD_ENTRIES, SEVERE_CUE } from './entries';

const CLAUSE_SPLIT = /[,.]|\b(?:tapos|at|and)\b/i;

// No negation handling by ruling: caution only goes up, a missed sign is worse than a follow-up.
function cue(clause: string): Severity {
  if (SEVERE_CUE.test(clause)) return 'severe';
  if (MILD_CUE.test(clause)) return 'mild';
  return 'unknown';
}

export function readText(text: string): Finding[] {
  const findings: Finding[] = [];
  for (const clause of text.split(CLAUSE_SPLIT)) {
    const severity = cue(clause);
    const seen = new Set<string>();
    for (const entry of ENTRIES) {
      if (!entry.pattern.test(clause)) continue;
      for (const code of entry.codes) {
        if (seen.has(code)) continue;
        seen.add(code);
        findings.push({ code, severity, sources: ['lexicon'], confidence: null });
      }
    }
  }
  return findings;
}

export function readMoods(text: string): Mood[] {
  return MOOD_ENTRIES.filter((m) => m.pattern.test(text)).map((m) => m.mood);
}

export function readWeeks(text: string): number | null {
  const match = /\b(\d{1,2})\s*(?:weeks?|wks?|linggo)\b/i.exec(text);
  if (!match) return null;
  const weeks = Number(match[1]);
  return weeks >= 1 && weeks <= 45 ? weeks : null;
}
