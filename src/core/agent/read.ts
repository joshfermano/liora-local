import { readMoods, readText, readWeeks } from '../lexicon';
import type { Activity, Flow, Symptom } from '../types';
import { ACTIVITIES, SYMPTOMS } from '../vocabulary';
import { readEdit, THANKS } from './edits';
import { readMemory } from './memory';
import type { AgentAction, DateWord } from './types';
import { dateWord } from './when';

// Input patterns only: what she might type, in Tagalog, Taglish or English. No advice here.
const PERIOD_WORD = /regla|\bmens\b|\bperiod\b|dalaw/i;
const START =
  /ni(?:re)?regla|nagka-?regla|nag-?mens|dinatnan|dinalaw|nagkaroon\s+(?:ako\s+)?(?:na\s+)?ng\s+regla|may\s+regla\s+na|dumating\s+na\s+(?:ang\s+)?regla|regla\s+(?:ko\s+)?(?:ay\s+)?(?:nagsimula|dumating)|(?:got|have|had)\s+my\s+period|(?:my\s+)?period\s+(?:has\s+)?(?:started|began|came)|\blog\s+(?:my\s+)?period\b|\bi-?log\s+(?:mo\s+)?(?:ang\s+|yung\s+)?(?:regla|period)|\bmag-?log\s+(?:ng\s+)?(?:regla|period)|nag-?(?:simula|start)\s+(?:na\s+)?(?:ang\s+)?(?:regla|mens|period)|started\s+my\s+period|nagkaroon\s+(?:(?:na|ako)\s+){1,2}ng\s+(?:regla|mens|period)|dumating\s+na\s+(?:ang\s+|yung\s+)?(?:regla|mens|period|dalaw)|\bmay\s+(?:regla|mens|period)\s+(?:na|ako)\b|nagka-?(?:period|mens)|\b(?:first|unang)\s+(?:day|araw)\s+(?:ng|of)\s+(?:my\s+)?(?:regla|mens|period)|\bday\s*1\s+(?:ng|of)\s+(?:my\s+)?(?:regla|mens|period)|\b(?:i'?m|i\s+am)\s+on\s+my\s+period/i;
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
  /^(?:\s|[,.!?]|\b(?:hi|hello|hey|liora|kumusta|kamusta|komusta|musta|uy|oy|hoy|ka|na|po|salamat|thanks?|thank|you|maraming|good|morning|afternoon|evening|magandang|umaga|gabi|hapon)\b)+$/i;
const QUESTION_START = /^\s*(?:ano|bakit|paano|puwede|pwede|(?:ok|okay)\s+lang\s+ba|normal\s+ba|safe\s+ba|masama\s+ba|is\s+it|is\s+this|can\s+i|should\s+i|what|why|how)\b/i;
// She wants her emergency contact: Liora shows her own Call and Text buttons; it never calls anyone.
const CONTACT =
  /\bemergency\s+contact\b|\b(?:call|text|message|tawagan|i-?text|i-?message|kontakin)\s+(?:(?:mo|naman|na|po)\s+)*(?:him|her|them|si|sya|siya|kay|my|ang|yung|sa|asawa|husband|partner|mama|nanay|papa|tatay)\b|\bpa-?(?:call|text|tawag)\b/i;
// A question with none of these words is chat ("Nag tatagalog ka ba?"), not a health question.
const HEALTH =
  /sakit|pain|hurt|ache|dugo|bleed|blood|buntis|pregnan|baby|sanggol|gamot|medicine|vitamin|normal|safe|delikado|danger|kain|\beat|food|pagkain|inom|drink|exercis|ehersisyo|lagnat|fever|suka|vomit|nause|hilo|dizz|cramp|puson|tiyan|ulo|discharge|ihi|\bpee|urin|contraction|hilab|labou?r|panganak|birth|ovulat|obul|fertile|regla|period|mens|cycle|check-?up|doctor|doktor|\bob\b|clinic|ospital|hospital|symptom|sintomas|breast|dede|gatas|milk|tulog|sleep|stress|anxi|weight|timbang|\bsex|contracep|\bpills?\b|condom|trimester|weeks?\b|linggo|swell|manas|maga|headache|bloat|kabag|kirot|hapdi|pagod|tired|kape|coffee|caffeine|alak|alcohol|beer|wine|yosi|smok|\b(?:pwede|puwede)\s+ba\b|\bcan\s+i\b|\bshould\s+i\b|\bbawal\b|\bok(?:ay)?\s+lang\s+ba\b/i;
const CYCLE_QUESTION = /\bkailan\b.*(?:regla|period|mens|dalaw)|(?:regla|period|mens|dalaw).*\bkailan\b|\bwhen\b.*(?:period|next)|next\s+(?:period|regla)/i;



const unique = <T>(items: T[]): T[] => [...new Set(items)];

function flowOf(text: string, hasPeriodWord: boolean): Flow | null {
  return FLOW.find((f) => f.pattern.test(text) && (f.alone || hasPeriodWord))?.flow ?? null;
}

function activitiesOf(text: string): Activity[] {
  const done = text.split(CLAUSE).filter((c) => !NEGATED.test(c));
  return ACTIVITIES.filter((a) => done.some((c) => ACTIVITY[a].test(c)));
}

export function readActions(text: string, today: string): AgentAction[] {
  if (GREETING_ONLY.test(text) && text.trim()) return [{ tool: 'smalltalk' }];
  const memory = readMemory(text);
  if (memory) return memory;
  const edit = readEdit(text, today);
  if (edit) return edit;
  const cycleQuestion = CYCLE_QUESTION.test(text);
  const question = /\?/.test(text) || QUESTION_START.test(text);
  const hasPeriodWord = PERIOD_WORD.test(text);
  const now: DateWord = { kind: 'today' };
  const out: AgentAction[] = [];

  if (!question && !NOT_YET.test(text)) {
    const flow = flowOf(text, hasPeriodWord);
    if (START.test(text)) out.push({ tool: 'period_start', date: dateWord(text, { kind: 'unknown' }, today), flow });
    else if (hasPeriodWord && END.test(text)) out.push({ tool: 'period_end', date: dateWord(text, { kind: 'unknown' }, today) });
    else if (flow) out.push({ tool: 'flow', date: dateWord(text, now, today), flow });
  }

  const symptoms = unique(readText(text).map((f) => f.code)).filter((c): c is Symptom => (SYMPTOMS as readonly string[]).includes(c));
  if (symptoms.length) out.push({ tool: 'symptoms', date: dateWord(text, now, today), symptoms });
  const moods = readMoods(text);
  if (moods.length) out.push({ tool: 'moods', date: dateWord(text, now, today), moods });
  const activities = question ? [] : activitiesOf(text);
  if (activities.length) out.push({ tool: 'activities', date: dateWord(text, now, today), activities });
  const weeks = readWeeks(text);
  if (weeks !== null) out.push({ tool: 'weeks', weeks });

  if (CONTACT.test(text)) out.push({ tool: 'contact' });
  else if (cycleQuestion) out.push({ tool: 'cycle_question' });
  else if (question) out.push(HEALTH.test(text) || out.length > 0 ? { tool: 'health_question' } : { tool: 'smalltalk' });
  if (out.length === 0 && THANKS.test(text)) out.push({ tool: 'smalltalk' });
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
