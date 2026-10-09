import { fromTypedDecision, type Thresholds } from '../core/merge';
import type { DangerCode, Finding, Severity } from '../core/types';
import { DANGER_CODES } from '../core/vocabulary';
import { fill, PROMPTS } from './prompts';

// What each WHO ANC.DT.01 code looks like in her words. These are reading questions for the
// model, never shown to her and never advice.
const ASK: Record<DangerCode, string> = {
  vaginal_bleeding: 'Does the message say she has bleeding from the vagina?',
  convulsions: 'Does the message say she has convulsions or fits?',
  fever: 'Does the message say she has a fever?',
  severe_headache: 'Does the message say she has a headache?',
  visual_disturbance: 'Does the message say she has blurred vision or trouble seeing?',
  imminent_delivery: 'Does the message say that the baby is about to be born right now?',
  labour: 'Does the message say she has labour pains or contractions?',
  looks_very_ill: 'Does the message itself say she is very sick or very ill, not just that something hurts?',
  severe_vomiting: 'Does the message say she is vomiting?',
  severe_pain: 'Does the message say she has pain somewhere in her body?',
  severe_abdominal_pain: 'Does the message say she has pain in her belly?',
  unconscious: 'Does the message say she fainted, passed out or cannot be woken?',
  central_cyanosis: 'Does the message say her lips or tongue are blue or grey?',
  severe_difficulty_breathing: 'Does the message say she has difficulty breathing?',
};

const HOW_BAD: Partial<Record<DangerCode, string>> = {
  severe_headache: 'the headache',
  severe_vomiting: 'the vomiting',
  severe_pain: 'the pain',
  severe_abdominal_pain: 'the belly pain',
  severe_difficulty_breathing: 'the difficulty breathing',
};

export const YESNO = ['yes', 'no'] as const;
const ANSWER = '\nAnswer with one word: yes or no.';

export type Question = { id: string; code: DangerCode; text: string; options: typeof YESNO };

export const PRESENCE: Question[] = DANGER_CODES.map((code) => ({
  id: `yesno.${code}`,
  code,
  text: ASK[code] + ANSWER,
  options: YESNO,
}));

// The Tagalog words are intensity hints for reading her message, not medical wording.
function severityQuestions(code: DangerCode): Question[] {
  const thing = HOW_BAD[code];
  if (!thing) return [];
  return [
    {
      id: `severe.${code}`,
      code,
      text: `Does the message say ${thing} is very bad or severe (for example "sobra", "grabe" or "hindi ko na kaya")?${ANSWER}`,
      options: YESNO,
    },
    {
      id: `mild.${code}`,
      code,
      text: `Does the message say ${thing} is only mild or moderate (for example "medyo", "konti" or "kaunti lang")?${ANSWER}`,
      options: YESNO,
    },
  ];
}

export const QUESTIONS: Question[] = [...PRESENCE, ...DANGER_CODES.flatMap(severityQuestions)];

// Severity is asked only for the signs her message mentions, which keeps the set short.
export function followUpQuestions(answers: Record<string, number[]>, { tauLo }: Thresholds): Question[] {
  return DANGER_CODES.filter((code) => (answers[`yesno.${code}`]?.[0] ?? 0) >= tauLo).flatMap(severityQuestions);
}

export function promptFor(message: string, question: Question) {
  return fill(PROMPTS.typed.text, { message, question: question.text });
}

type Scores = { readonly [tokenId: number]: number | undefined };

export function restrictedSoftmax(logits: Scores, options: readonly (readonly number[])[]) {
  const pooled = options.map((ids) => {
    const values = ids.map((id) => logits[id] ?? -Infinity);
    const top = Math.max(...values);
    if (top === -Infinity) return -Infinity;
    return top + Math.log(values.reduce((sum, v) => sum + Math.exp(v - top), 0));
  });
  const top = Math.max(...pooled);
  if (top === -Infinity) throw new Error('None of the options is among the scored tokens');
  const weights = pooled.map((score) => Math.exp(score - top));
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}

// Native runtimes report only the top few next tokens with their probabilities.
export function logScoresFromTopProbs(top: readonly { tok_id: number; prob: number }[]): Scores {
  return Object.fromEntries(top.map(({ tok_id, prob }) => [tok_id, Math.log(prob)]));
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

function severityFrom(severe: number | undefined, mild: number | undefined, { tauLo, tauHi }: Thresholds): Severity | null {
  if (severe === undefined || mild === undefined) return null;
  if (severe >= tauHi) return 'severe';
  if (severe >= tauLo) return null;
  if (mild >= tauHi) return 'moderate';
  return null;
}

export function toFindings(answers: Record<string, number[]>, thresholds: Thresholds): Finding[] {
  const findings: Finding[] = [];
  for (const code of DANGER_CODES) {
    const yes = answers[`yesno.${code}`];
    if (!yes) continue;
    const severity = HOW_BAD[code]
      ? severityFrom(answers[`severe.${code}`]?.[0], answers[`mild.${code}`]?.[0], thresholds)
      : null;
    const finding = fromTypedDecision(code, yes[0] ?? 0, severity, thresholds);
    if (!finding) continue;
    // A confident "only mild or moderate" settles severity even when the sign itself is uncertain.
    findings.push(severity === 'moderate' ? { ...finding, severity } : finding);
  }
  return findings;
}
