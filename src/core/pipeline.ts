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

// The WHO tables cover pregnancy and the weeks after birth (user's call, 2026-10-10): when her
// profile says she is not pregnant, her symptoms are logged without the danger-sign check, unless
// her message itself says she is pregnant or she opens the danger-sign checklist. An unset status
// keeps the full check.
const SAYS_PREGNANT =
  /buntis|nagdadalang-?tao|pregnan|\bweeks?\b|\bmonths?\b|\bbuwan\b|linggo\s+na\s+(?:akong|ako)|kabuwanan|panganak|manganak|nanganak|\blabou?r\b|contraction|hilab|\bwaters?\s+broke|panubigan|\bbaby\b|sanggol|newborn|postpartum|post-partum|gave\s+birth|giving\s+birth|c-?section|caesarean|cesarean|miscarri|nakunan|makunan/i;

export function dangerRulesApply(context: Context, input: Entry['input'], text: string): boolean {
  return context.status !== 'neither' || input === 'checklist' || SAYS_PREGNANT.test(text);
}

function decide(findings: Entry['findings'], context: Context, input: Entry['input'], text: string): Entry['decision'] {
  return dangerRulesApply(context, input, text) ? evaluate(findings, context) : { level: 'ok', fired: [] };
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
    decision: decide(findings, context, input, text),
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
