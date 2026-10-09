import { toFindings } from '../ai/typed-decisions';
import { applyAnswer, askedTogether, type Answer } from './followups';
import { readText, readWeeks } from './lexicon';
import { MILD_CUE, SEVERE_CUE } from './lexicon/entries';
import { readPeriod } from './lexicon/period';
import { mergeFindings, PROVISIONAL_THRESHOLDS } from './merge';
import { evaluate } from './rules';
import type { Context, Entry, Extraction, Finding } from './types';

export interface PipelineInput {
  id: string;
  now: Date;
  text: string;
  input: Entry['input'];
  context: Context;
  typedAnswers?: Record<string, number[]>;
  models?: Entry['models'];
}

function extract(text: string, now: Date): Extraction | null {
  const weeks = readWeeks(text);
  const period = readPeriod(text, now);
  if (weeks === null && period === null) return null;
  return { period, symptoms: [], moods: [], danger_signs: [], pregnancy_weeks: weeks };
}

const STRONG_IN_HER_WORDS = /(?:hindi|di)\s+ko\s+na\s+(?:kaya|matiis)|\bvery\b|\bworst\b|unbearable|\bterrible\b|can'?t\s+(?:take|bear|stand)/i;

// SR-1: the model may never settle how bad a sign is on its own; her words or her answer do. Its
// "mild" reading counts only when her words carry a mild word and no strong one, and its "very bad"
// reading only when her words carry a strong one. Otherwise Liora asks the follow-up first.
function cautious(findings: Finding[], text: string): Finding[] {
  const strong = SEVERE_CUE.test(text) || STRONG_IN_HER_WORDS.test(text);
  const mild = MILD_CUE.test(text) && !strong;
  return findings.map((f) => {
    if (!f.code.startsWith('severe_')) return f;
    if (f.severity === 'severe' && !strong) return { ...f, severity: 'unknown' };
    if ((f.severity === 'mild' || f.severity === 'moderate') && !mild) return { ...f, severity: 'unknown' };
    return f;
  });
}

export function runPipeline({ id, now, text, input, context, typedAnswers, models }: PipelineInput): Entry {
  const findings = mergeFindings([
    ...readText(text),
    ...(typedAnswers ? cautious(toFindings(typedAnswers, PROVISIONAL_THRESHOLDS), text) : []),
  ]);
  return {
    id,
    created_at: now.toISOString(),
    text,
    input,
    findings,
    extraction: extract(text, now),
    decision: evaluate(findings, context),
    card_ids: [],
    models: models ?? [],
  };
}

export function applyFollowUpAnswer(entry: Entry, answer: Answer, context: Context): Entry {
  const pending = entry.decision.follow_up?.code;
  if (!pending) return entry;
  const severity = applyAnswer(answer);
  // The question asked covers every still-open sign she hears it for, not just the one that raised it.
  const covered = askedTogether(pending);
  const findings = entry.findings.map((f) =>
    f.code === pending || (covered.includes(f.code) && f.severity === 'unknown') ? { ...f, severity } : f,
  );
  return { ...entry, findings, decision: evaluate(findings, context) };
}
