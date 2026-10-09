import { readMoods, readText, readWeeks } from '../lexicon';
import type { Activity, Flow, Symptom } from '../types';
import { ACTIVITIES, SYMPTOMS } from '../vocabulary';
import type { AgentAction, DateWord } from './types';

// Input patterns only: what she might type, in Tagalog, Taglish or English. No advice here.
const PERIOD_WORD = /regla|\bmens\b|\bperiod\b|dalaw/i;
const START =
  /ni(?:re)?regla|nagka-?regla|nag-?mens|dinatnan|dinalaw|nagkaroon\s+(?:ako\s+)?(?:na\s+)?ng\s+regla|may\s+regla\s+na|dumating\s+na\s+(?:ang\s+)?regla|regla\s+(?:ko\s+)?(?:ay\s+)?(?:nagsimula|dumating)|(?:got|have|had)\s+my\s+period|(?:my\s+)?period\s+(?:has\s+)?(?:started|began|came)/i;
const END = /natapos|tapos\s+na|wala\s+na|huminto|\b(?:ended|stopped|finished)\b/i;
const NOT_YET = /(?:hindi|di|wala)\s+pa\b|\bnot\s+yet\b|haven'?t/i;
const NEGATED = /\b(?:hindi|di|walang|ayaw|didn'?t|did\s+not|not|never|no)\b/i;
const CLAUSE = /[,.;!?]|\b(?:pero|but)\b/i;

const FLOW: { pattern: RegExp; flow: Flow; alone: boolean }[] = [
  { pattern: /spotting|patak/i, flow: 'spotting', alone: true },
  { pattern: /malakas|\bheavy\b/i, flow: 'heavy', alone: false },
  { pattern: /katamtaman|\bmedium\b/i, flow: 'medium', alone: false },
  { pattern: /mahina|konti|\blight\b/i, flow: 'light', alone: false },
];

const ACTIVITY: Record<Activity, RegExp> = {
  walk: /\b(?:naglakad|lakad|nag-?walk|walk(?:ed|ing)?|went\s+for\s+a\s+walk)\b/i,
  exercise: /ehersisyo|nag-?exercise|\bexercis(?:e|ed|ing)\b|work-?out/i,
  rest: /pahinga|\brest(?:ed)?\b/i,
  water: /uminom\s+(?:ako\s+)?ng\s+(?:maraming\s+)?tubig|\bdr(?:ank|ink|inking)\s+(?:a\s+lot\s+of\s+)?water\b|\bwater\s+intake\b/i,
  slept_well: /nakatulog\s+(?:ako\s+)?(?:nang|ng)\s+maayos|slept\s+well|good\s+(?:night'?s\s+)?sleep|maayos\s+ang\s+tulog/i,
  checkup_visit: /nagpa-?check-?up|prenatal|\bcheck-?up\b/i,
  medicine_taken: /gamot\s+na\s+reseta|took\s+my\s+prescribed|prescribed\s+(?:medicine|meds|vitamins)|ininom\s+ko\s+ang\s+reseta/i,
};

const GREETING_ONLY =
  /^(?:\s|[,.!?]|\b(?:hi|hello|hey|liora|kumusta|musta|ka|na|po|salamat|thanks?|thank|you|maraming|good|morning|afternoon|evening|magandang|umaga|gabi|hapon)\b)+$/i;
const QUESTION_START = /^\s*(?:ano|bakit|paano|puwede|pwede|(?:ok|okay)\s+lang\s+ba|normal\s+ba|safe\s+ba|masama\s+ba|is\s+it|is\s+this|can\s+i|should\s+i|what|why|how)\b/i;
const CYCLE_QUESTION = /\bkailan\b.*(?:regla|period|mens|dalaw)|(?:regla|period|mens|dalaw).*\bkailan\b|\bwhen\b.*(?:period|next)|next\s+(?:period|regla)/i;

const DAYS_AGO = /(\d{1,2})\s*(?:araw\s+na|days?\s+ago|araw\s+(?:ang\s+)?(?:nakaraan|nakalipas))/i;
const ISO_DATE = /\b(\d{4}-\d{2}-\d{2})\b/;

function dateWord(text: string, fallback: DateWord): DateWord {
  const iso = ISO_DATE.exec(text);
  if (iso) return { kind: 'date', date: iso[1]! };
  if (/\b(?:kahapon|yesterday)\b/i.test(text)) return { kind: 'yesterday' };
  const ago = DAYS_AGO.exec(text);
  if (ago) return { kind: 'days_ago', n: Number(ago[1]) };
  if (/\b(?:ngayon|today|kanina)\b/i.test(text)) return { kind: 'today' };
  return fallback;
}

const unique = <T>(items: T[]): T[] => [...new Set(items)];

function flowOf(text: string, hasPeriodWord: boolean): Flow | null {
  return FLOW.find((f) => f.pattern.test(text) && (f.alone || hasPeriodWord))?.flow ?? null;
}

function activitiesOf(text: string): Activity[] {
  const done = text.split(CLAUSE).filter((c) => !NEGATED.test(c));
  return ACTIVITIES.filter((a) => done.some((c) => ACTIVITY[a].test(c)));
}

export function readActions(text: string, _today: string): AgentAction[] {
  if (GREETING_ONLY.test(text) && text.trim()) return [{ tool: 'smalltalk' }];
  const cycleQuestion = CYCLE_QUESTION.test(text);
  const question = /\?/.test(text) || QUESTION_START.test(text);
  const hasPeriodWord = PERIOD_WORD.test(text);
  const now: DateWord = { kind: 'today' };
  const out: AgentAction[] = [];

  if (!question && !NOT_YET.test(text)) {
    const flow = flowOf(text, hasPeriodWord);
    if (START.test(text)) out.push({ tool: 'period_start', date: dateWord(text, { kind: 'unknown' }), flow });
    else if (hasPeriodWord && END.test(text)) out.push({ tool: 'period_end', date: dateWord(text, { kind: 'unknown' }) });
    else if (flow) out.push({ tool: 'flow', date: dateWord(text, now), flow });
  }

  const symptoms = unique(readText(text).map((f) => f.code)).filter((c): c is Symptom => (SYMPTOMS as readonly string[]).includes(c));
  if (symptoms.length) out.push({ tool: 'symptoms', date: dateWord(text, now), symptoms });
  const moods = readMoods(text);
  if (moods.length) out.push({ tool: 'moods', date: dateWord(text, now), moods });
  const activities = question ? [] : activitiesOf(text);
  if (activities.length) out.push({ tool: 'activities', date: dateWord(text, now), activities });
  const weeks = readWeeks(text);
  if (weeks !== null) out.push({ tool: 'weeks', weeks });

  if (cycleQuestion) out.push({ tool: 'cycle_question' });
  else if (question) out.push({ tool: 'health_question' });
  return out;
}

// Rules win: Gemma's actions only fill tools the rules did not find, one per tool.
export function mergeActions(rules: AgentAction[], gemma: AgentAction[]): AgentAction[] {
  const seen = new Set(rules.map((a) => a.tool));
  const out = [...rules];
  for (const a of gemma) {
    if (seen.has(a.tool)) continue;
    seen.add(a.tool);
    out.push(a);
  }
  return out;
}
