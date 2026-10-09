import { toFindings } from '../ai/typed-decisions';
import { applyAnswer, type Answer } from './followups';
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

// SR-1: the model may add caution but never remove a follow-up on its own. Its "mild" reading of a
// severity sign counts only when her own words carry a mild word from the word list and no strong one.
function cautious(findings: Finding[], text: string): Finding[] {
  const mildInHerWords = MILD_CUE.test(text) && !SEVERE_CUE.test(text);
  if (mildInHerWords) return findings;
  return findings.map((f) =>
    f.code.startsWith('severe_') && (f.severity === 'mild' || f.severity === 'moderate') ? { ...f, severity: 'unknown' } : f,
  );
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
  const findings = entry.findings.map((f) => (f.code === pending ? { ...f, severity } : f));
  return { ...entry, findings, decision: evaluate(findings, context) };
}
