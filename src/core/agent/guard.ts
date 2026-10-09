import { readText } from '../lexicon';
import { DANGER_CODES, SYMPTOMS } from '../vocabulary';

const MAX_CHARS = 160;
const LABELS = [...SYMPTOMS, ...DANGER_CODES].map((c) => c.replace(/_/g, ' '));
const BANNED = [
  'doctor', 'doktor', 'hospital', 'ospital', 'clinic', 'gamot', 'medicine', 'tablet', 'dose', 'vitamin', 'inumin',
  'uminom', 'ininom', 'take', 'dapat', 'should', 'must', 'kailangan', 'normal', 'delikado', 'dangerous', 'safe',
  'okay ka lang', "you're fine", 'you are fine', 'diagnose', 'bleeding', 'dugo', 'sakit', 'pain', 'contraception',
  'contraceptive', 'birth control', 'pill', 'pills', 'condom', 'iud', 'implant', 'withdrawal',
  // reassurance and advice: Liora may comfort her, never tell her she is fine or what to do
  'worry', 'worried', 'okay', 'ok', 'fine', 'alright', 'rest', 'drink', 'eat', 'try', 'avoid', 'huwag', 'wag',
  // dates and times: every date comes from code
  'bukas', 'tomorrow', 'kahapon', 'yesterday', 'tonight', 'mamaya', 'week', 'weeks', 'linggo', 'month', 'buwan',
  ...LABELS,
];
// Tagalog affixes wrap a root (magpahinga, mag-alala, uminom), so these roots match inside words.
const BANNED_ROOTS = /pahinga|alala|inom/i;
const BANNED_WORDS = new RegExp(`(?<![\\p{L}\\p{N}])(?:${BANNED.join('|')})(?![\\p{L}\\p{N}])`, 'iu');
const URL = /https?:|www\.|\b[\w-]+\.(?:com|ph|org|net|io|app|gov|edu)\b/i;
const LIST_MARK = /\n|[•▪●]|(?:^|\s)[-*]\s/;

// Returns the warm line if it is safe to show, or null so a fixed line is used instead. Gemma may
// only be warm; it may never advise, reassure, name a symptom or give a number.
export function guardWarm(text: string): string | null {
  const line = text.trim().replace(/[‘’]/g, "'");
  if (!line || line.length > MAX_CHARS) return null;
  if (/\d/.test(line) || URL.test(line) || LIST_MARK.test(line)) return null;
  if (BANNED_WORDS.test(line) || BANNED_ROOTS.test(line) || readText(line).length > 0) return null;
  return text.trim();
}
