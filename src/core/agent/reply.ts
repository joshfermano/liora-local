import { readText } from '../lexicon';
import { DANGER_CODES, SYMPTOMS } from '../vocabulary';
import type { Facts } from './types';

// Words that make a sentence advice, reassurance or diagnosis. Gemma may only restate the facts.
const BANNED = [
  'medicine', 'medication', 'gamot', 'dose', 'dosage', 'mg', 'tablet', 'vitamin', 'vitamins', 'take', 'inumin', 'uminom',
  'ininom', 'should', 'dapat', 'must', 'kailangan', 'normal', 'abnormal', 'safe', 'unsafe', 'delikado', 'dangerous',
  'doctor', 'doktor', 'hospital', 'ospital', 'clinic', 'diagnose', 'diagnosis', 'infection', 'impeksyon', 'preeclampsia',
  'pre-eclampsia', 'eclampsia', 'miscarriage', 'anemia', 'diabetes', 'ectopic', 'gestational', 'okay ka lang',
  "you're fine", 'you are fine', "don't worry", 'do not worry', 'worry', 'worried', 'try', 'avoid', 'drink', 'eat', 'huwag',
  'contraception', 'contraceptive', 'contraceptives', 'birth control', 'pill', 'pills', 'condom', 'iud', 'implant', 'withdrawal',
];
const BANNED_WORDS = new RegExp(`(?<![\\p{L}\\p{N}])(?:${BANNED.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}])`, 'iu');
const BANNED_ROOTS = /alala|inom|pahinga/i;
const URL = /https?:|www\.|\b[\w-]+\.(?:com|ph|org|net|io|app|gov|edu)\b/i;
const LABELS = [...SYMPTOMS, ...DANGER_CODES];

function flat(facts: Facts): string {
  return Object.values(facts)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v) => v !== null)
    .map(String)
    .join(' | ')
    .toLowerCase()
    .replace(/_/g, ' ');
}

// Keeps the sentences of Gemma's reply that are safe to show (no medical advice, diagnosis,
// medicine, contraception advice, or any number missing from the facts); null when none are. A
// symptom may be named only when it is in the facts, that is, when she logged it herself.
export function guardReply(text: string, facts: Facts): string | null {
  const known = flat(facts);
  const numbers = new Set(known.match(/\d+/g) ?? []);
  const ok = (sentence: string) => {
    if (URL.test(sentence) || BANNED_WORDS.test(sentence) || BANNED_ROOTS.test(sentence)) return false;
    if ((sentence.match(/\d+/g) ?? []).some((n) => !numbers.has(n))) return false;
    const lower = sentence.toLowerCase();
    if (LABELS.some((c) => lower.includes(c.replace(/_/g, ' ')) && !known.includes(c.replace(/_/g, ' ')))) return false;
    return readText(sentence).every((f) => known.includes(f.code.replace(/_/g, ' ')));
  };
  const kept = text
    .replace(/[‘’]/g, "'")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s && ok(s));
  return kept.length ? kept.join(' ') : null;
}
