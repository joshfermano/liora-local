import { toFindings } from '../ai/typed-decisions';
import { applyAnswer, type Answer } from './followups';
import { readText, readWeeks } from './lexicon';
import { mergeFindings, PROVISIONAL_THRESHOLDS } from './merge';
import { evaluate } from './rules';
import type { Context, Entry, Extraction } from './types';

export interface PipelineInput {
  id: string;
  now: Date;
  text: string;
  input: Entry['input'];
  context: Context;
  typedAnswers?: Record<string, number[]>;
  models?: Entry['models'];
}

function extract(text: string): Extraction | null {
  const weeks = readWeeks(text);
  if (weeks === null) return null;
  return { period: null, symptoms: [], moods: [], danger_signs: [], pregnancy_weeks: weeks };
}

export function runPipeline({ id, now, text, input, context, typedAnswers, models }: PipelineInput): Entry {
  const findings = mergeFindings([
    ...readText(text),
    ...(typedAnswers ? toFindings(typedAnswers, PROVISIONAL_THRESHOLDS) : []),
  ]);
  return {
    id,
    created_at: now.toISOString(),
    text,
    input,
    findings,
    extraction: extract(text),
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
