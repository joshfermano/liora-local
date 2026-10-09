import { fromTypedDecision, type Thresholds } from '../core/merge';
import type { DangerCode, Finding, Severity } from '../core/types';
import { DANGER_CODES } from '../core/vocabulary';

// What each WHO ANC.DT.01 code looks like in her words. These are reading questions for the
// model, never shown to her and never advice.
const DESCRIBES: Record<DangerCode, string> = {
  vaginal_bleeding: 'bleeding from the vagina',
  convulsions: 'convulsions or fits',
  fever: 'a fever',
  severe_headache: 'a headache',
  visual_disturbance: 'blurred vision or trouble seeing',
  imminent_delivery: 'that the baby is about to be born right now',
  labour: 'labour pains or contractions',
  looks_very_ill: 'that she looks or feels very ill',
  severe_vomiting: 'vomiting',
  severe_pain: 'pain somewhere in her body',
  severe_abdominal_pain: 'pain in her belly',
  unconscious: 'that she fainted, passed out or cannot be woken',
  central_cyanosis: 'blue or grey lips or tongue',
};

const HOW_BAD: Partial<Record<DangerCode, string>> = {
  severe_headache: 'the headache',
  severe_vomiting: 'the vomiting',
  severe_pain: 'the pain',
  severe_abdominal_pain: 'the belly pain',
};

export const YESNO = ['yes', 'no'] as const;
export const SCORE = ['mild', 'moderate', 'severe', 'unsure'] as const;

export type Question =
  | { kind: 'yesno'; id: string; code: DangerCode; text: string; options: typeof YESNO }
  | { kind: 'score'; id: string; code: DangerCode; text: string; options: typeof SCORE };

export const QUESTIONS: Question[] = [
  ...DANGER_CODES.map((code) => ({
    kind: 'yesno' as const,
    id: `yesno.${code}`,
    code,
    text: `Does the message say she has ${DESCRIBES[code]}?\nAnswer with one word: yes or no.`,
    options: YESNO,
  })),
  ...DANGER_CODES.filter((code) => HOW_BAD[code]).map((code) => ({
    kind: 'score' as const,
    id: `score.${code}`,
    code,
    text:
      `How bad does the message say ${HOW_BAD[code]} is?\n` +
      'Answer with one word: mild, moderate, severe, or unsure if the message does not say.',
    options: SCORE,
  })),
];

export function promptFor(message: string, question: Question) {
  return (
    'A pregnant woman or new mother wrote this message. It may be in Tagalog, Taglish, Cebuano or English.\n\n' +
    `Message: "${message}"\n\n` +
    question.text
  );
}

export function restrictedSoftmax(logits: ArrayLike<number>, options: readonly (readonly number[])[]) {
  const pooled = options.map((ids) => {
    const values = ids.map((id) => logits[id] ?? -Infinity);
    const top = Math.max(...values);
    return top + Math.log(values.reduce((sum, v) => sum + Math.exp(v - top), 0));
  });
  const top = Math.max(...pooled);
  const weights = pooled.map((score) => Math.exp(score - top));
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}

export function optionTokenIds(encode: (text: string) => number[], options: readonly string[]) {
  const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  const seen = new Map<number, string>();
  return options.map((option) => {
    const ids = new Set<number>();
    for (const spelling of [option, ` ${option}`, capital(option), ` ${capital(option)}`]) {
      const [only, ...rest] = encode(spelling);
      if (only !== undefined && rest.length === 0) ids.add(only);
    }
    if (ids.size === 0) throw new Error(`Option "${option}" has no single-token spelling`);
    for (const id of ids) {
      const other = seen.get(id);
      if (other && other !== option) throw new Error(`Options "${other}" and "${option}" share token ${id}`);
      seen.set(id, option);
    }
    return [...ids];
  });
}

export function splitPrefix(sequences: number[][]) {
  const first = sequences[0] ?? [];
  const shortest = Math.min(...sequences.map((s) => s.length));
  let length = 0;
  while (length < shortest - 1 && sequences.every((s) => s[length] === first[length])) length++;
  return { prefix: first.slice(0, length), suffixes: sequences.map((s) => s.slice(length)) };
}

function scoredSeverity(probs: number[] | undefined, { tauLo, tauHi }: Thresholds): Severity | null {
  if (!probs) return null;
  const [mild = 0, moderate = 0, severe = 0] = probs;
  if (severe >= tauHi) return 'severe';
  if (severe >= tauLo) return null;
  if (mild >= tauHi) return 'mild';
  if (moderate >= tauHi) return 'moderate';
  return null;
}

export function toFindings(answers: Record<string, number[]>, thresholds: Thresholds): Finding[] {
  const findings: Finding[] = [];
  for (const code of DANGER_CODES) {
    const yes = answers[`yesno.${code}`];
    if (!yes) continue;
    const severity = HOW_BAD[code] ? scoredSeverity(answers[`score.${code}`], thresholds) : null;
    const finding = fromTypedDecision(code, yes[0] ?? 0, severity, thresholds);
    if (finding) findings.push(finding);
  }
  return findings;
}
