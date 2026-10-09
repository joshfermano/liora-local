import { readMoods, readText, readWeeks } from '../lexicon';
import type { Activity, Flow, Symptom } from '../types';
import { ACTIVITIES, SYMPTOMS } from '../vocabulary';
import { readEdit, THANKS } from './edits';
import { readMemory } from './memory';
import type { AgentAction, DateWord } from './types';
import { dateWord } from './when';
import { readDischarge } from './discharge';

// Input patterns only: what she might type, in Tagalog, Taglish or English. No advice here.
const PERIOD_WORD = /regla|\bmens\b|\bperiod\b|dalaw/i;
// Speech-to-text spells "niregla" many ways: "na regla", "naregla", "nagregla", "nire-regla".
const START =
  /ni(?:re)?-?regla|(?<!tapos\s)\bna\s+regla\s+(?:na\s+)?ako\b|\bnaregla|\bnagregla|nagka-?regla|nag-?mens|dinatnan|dinalaw|nagkaroon\s+(?:ako\s+)?(?:na\s+)?ng\s+regla|may\s+regla\s+na|dumating\s+na\s+(?:ang\s+)?regla|regla\s+(?:ko\s+)?(?:ay\s+)?(?:nagsimula|dumating)|(?:got|have|had)\s+my\s+period|(?:my\s+)?period\s+(?:has\s+)?(?:started|began|came)|\blog\s+(?:my\s+)?period\b|\bi-?log\s+(?:mo\s+)?(?:ang\s+|yung\s+)?(?:regla|period)|\bmag-?log\s+(?:ng\s+)?(?:regla|period)|nag-?(?:simula|start)\s+(?:na\s+)?(?:ang\s+)?(?:regla|mens|period)|started\s+my\s+period|nagkaroon\s+(?:(?:na|ako)\s+){1,2}ng\s+(?:regla|mens|period)|dumating\s+na\s+(?:ang\s+|yung\s+)?(?:regla|mens|period|dalaw)|\bmay\s+(?:regla|mens|period)\s+(?:na|ako)\b|nagka-?(?:period|mens)|\b(?:first|unang)\s+(?:day|araw)\s+(?:ng|of)\s+(?:my\s+)?(?:regla|mens|period)|\bday\s*1\s+(?:ng|of)\s+(?:my\s+)?(?:regla|mens|period)|\b(?:i'?m|i\s+am)\s+on\s+my\s+period|^\s*(?:(?:regla|mens|dalaw|period)\s+ko|may\s+(?:regla|mens|dalaw)\s+(?:na\s+)?ako)\s+(?:na\s+)?(?:ngayon|today|kanina|kahapon|na)?\s*[.!]*\s*$|\bmay\s+dalaw\s+(?:na|ako)\b/i;
const END = /natapos|tapos\s+na|wala\s+na|huminto|\b(?:ended|stopped|finished)\b|\b(?:last|huling)\s+(?:day|araw)\s+(?:ng|of)\b/i;
const NOT_YET = /(?:hindi|di|wala)\s+(?:pa|pala)\b|\bnot\s+yet\b|haven'?t|\bdid\s*n'?t\s+(?:get|have|start)\b/i;
const NEGATED = /\b(?:hindi|di|walang|ayaw|didn'?t|did\s+not|not|never|no)\b/i;
const CLAUSE = /[,.;!?]|\b(?:pero|but)\b/i;

const FLOW: { pattern: RegExp; flow: Flow; alone: boolean }[] = [
  { pattern: /spotting|patak/i, flow: 'spotting', alone: true },
  { pattern: /malakas|mabigat|\bheavy\b/i, flow: 'heavy', alone: false },
  { pattern: /katamtaman|\bmedium\b/i, flow: 'medium', alone: false },
  { pattern: /mahina|konti|\blight\b/i, flow: 'light', alone: false },
];

const ACTIVITY: Record<Activity, RegExp> = {
  walk: /\b(?:naglakad|lakad|nag-?walk|walk(?:ed|ing)?|went\s+for\s+a\s+walk)\b/i,
  exercise: /ehersisyo|nag-?exercise|\bnag-?jogging\b|\bjog(?:ged|ging)?\b|\btumakbo\b|\bnagtakbo\b|\bran\b|\brunning\b|\bwent\s+for\s+a\s+run\b|\bnag-?gym\b|\bexercis(?:e|ed|ing)\b|work-?out|\bnag-?yoga\b|\byoga\b|\bpilates\b|\bswimming\b|\bnag-?swimming\b|\bstretch(?:ing|ed)?\b|\bnag-?zumba\b/i,
  rest: /pahinga|\brest(?:ed)?\b/i,
  water: /uminom\s+(?:ako\s+)?ng\s+(?:maraming\s+)?tubig|\bdr(?:ank|ink|inking)\s+(?:a\s+lot\s+of\s+)?water\b|\bwater\s+intake\b/i,
  slept_well: /nakatulog\s+(?:ako\s+)?(?:nang|ng)\s+maayos|slept\s+well|good\s+(?:night'?s\s+)?sleep|maayos\s+ang\s+tulog/i,
  checkup_visit: /nagpa-?check[-\s]?up|nag-?check[-\s]?up|prenatal\s+(?:visit|check)|\bcheck[-\s]?up\s+(?:ako|ko|kanina|today|kahapon)\b|\bhad\s+(?:my|a)\s+check-?up\b|\bwent\s+to\s+(?:my|the)\s+(?:check-?up|ob)\b/i,
  medicine_taken: /gamot\s+na\s+reseta|took\s+my\s+prescribed|prescribed\s+(?:medicine|meds|vitamins)|ininom\s+ko\s+ang\s+reseta/i,
};

const GREETING_ONLY =
  /^(?:\s|[,.!?]|\b(?:hi|hello|hey|liora|kumusta|kamusta|komusta|musta|uy|oy|hoy|ka|na|po|salamat|thanks?|thank|you|maraming|good|morning|afternoon|evening|night|goodnight|magandang|umaga|gabi|hapon)\b)+$/i;
const QUESTION_START = /^\s*(?:ano|bakit|paano|puwede|pwede|(?:ok|okay)\s+lang\s+ba|normal\s+ba|safe\s+ba|masama\s+ba|is\s+it|is\s+this|can\s+i|should\s+i|what|why|how)\b/i;
// She wants her emergency contact: Liora shows her own Call and Text buttons; it never calls anyone.
const CONTACT =
  /\bemergency\s+contact\b|\b(?:call|text|message|tawagan|i-?text|i-?message|kontakin)\s+(?:(?:mo|naman|na|po)\s+)*(?:him|her|them|si|sya|siya|kay|my|ang|yung|sa|asawa|husband|partner|mama|nanay|papa|tatay)\b|\bpa-?(?:call|text|tawag)\b/i;
// A question with none of these words is chat ("Nag tatagalog ka ba?"), not a health question.
const HEALTH =
  /sakit|pain|hurt|ache|dugo|bleed|blood|buntis|pregnan|baby|sanggol|gamot|medicine|vitamin|normal|safe|delikado|danger|kain|\beat|food|pagkain|inom|drink|exercis|ehersisyo|lagnat|fever|suka|vomit|nause|hilo|dizz|cramp|puson|tiyan|ulo|discharge|ihi|\bpee|urin|contraction|hilab|labou?r|panganak|birth|ovulat|obul|fertile|regla|period|mens|cycle|check-?up|doctor|doktor|\bob\b|clinic|ospital|hospital|symptom|sintomas|breast|dede|gatas|milk|tulog|sleep|stress|anxi|weight|timbang|\bsex|contracep|\bpills?\b|condom|trimester|weeks?\b|linggo|swell|manas|maga|headache|bloat|kabag|kirot|hapdi|pagod|tired|manganak|pahinga|\brest\b|ihanda|prepar|tubig|water|kalinisan|hygien|maligo|\bbath|kape|coffee|caffeine|alak|alcohol|beer|wine|yosi|smok|\b(?:pwede|puwede)\s+ba\b|\bcan\s+i\b|\bshould\s+i\b|\bbawal\b|\bok(?:ay)?\s+lang\s+ba\b/i;
const WORRY = /\b(?:kulang|konti|kaunti|walang|wala|problema|problem|worried|worry|nag-?aalala|ayaw|hindi|di|baka|maybe|parang|bakit|mahina|low|not\s+enough|trouble|hirap)\b/i;
const ACK = /^\s*(?:ok(?:ay)?|okie|k|sige(?:\s+po)?|noted|got\s+it|alright|cool|nice|ayos|g|oo\s+sige|buti\s+naman|mabuti\s+naman|good|great|good\s+to\s+know|i\s+see|ah+\s+okay|gets)[\s.!]*$/i;
const ASKING = /\?\s*$|\bba\b|^\s*(?:ano|bakit|paano|puwede|pwede|is\s+it|is\s+this|is\s+that|can\s+i|should\s+i|what|why|how)\b/i;

// Her message without its question clauses: what she says is happening, not what she asks about.
function statements(text: string): string {
  const clauses = text.match(/[^,.;!?]+[,.;!?]*/g) ?? [];
  return clauses.filter((c) => !ASKING.test(c.trim())).join(' ');
}
const SINCE_BIRTH = /nanganak|panganak|since\s+(?:i\s+)?(?:gave\s+birth|birth|delivery|giving\s+birth)|after\s+(?:birth|delivery|giving\s+birth)|postpartum|\bold\b|gulang|\bpo?st-?partum\b|c-?section|\bcs\b/i;
const YESTERDAY = /\b(?:kahapon|yesterday)\b/i;
const BOTH_DAYS = /\b(?:kahapon|yesterday)\b.*\b(?:at|and|pati|tsaka|saka|hanggang|until)\s+(?:ngayon|today|kanina)\b|\b(?:ngayon|today)\s+(?:at|and|pati|tsaka|saka)\s+(?:kahapon|yesterday)\b/i;
const CYCLE_QUESTION =
  /\b(?:anong|what)\s+(?:araw|days?|petsa|dates?)\b.*\b(?:fertile|ovulat\w*|obul\w*|regla|period|mens)\b|\bwala\s+pa\s+(?:rin\s+|din\s+)?(?:akong\s+|ang\s+)?(?:regla|mens|dalaw|period)|\bhindi\s+pa\s+(?:rin\s+)?ako\s+(?:dinadatnan|nireregla|nagkakaregla)|\bperiod\s+(?:still\s+)?(?:has\s*n'?t|hasnt|did\s*n'?t|didnt)\s+(?:come|started|arrived)|\bilang\s+araw\s+(?:ang\s+|ba\s+ang\s+)?(?:regla|period|mens|dalaw)|\bhow\s+long\s+(?:is|does|do|will)\s+my\s+(?:period|cycle)|\bgaano\s+katagal\s+(?:ang\s+)?(?:regla|period|mens)|\b(?:delayed|late|delay)\s+(?:na\s+)?(?:ako|po)\b|\b(?:late|delayed|delay)\s+(?:na\s+)?(?:ang\s+|yung\s+)?(?:regla|period|mens|dalaw)|(?:regla|period|mens|dalaw)\s+(?:ko\s+)?(?:is\s+)?(?:late|delayed)|\baverage\s+(?:na\s+)?cycle\b|\bcycle\s+(?:length\s+)?ko\b|\bgaano\s+kahaba\s+(?:ang\s+)?(?:cycle|regla)\b|\bkailan\b.*(?:regla|period|mens|dalaw|fertile|obul|ovulat)|(?:regla|period|mens|dalaw).*\bkailan\b|\bwhen\b.*(?:period|next|fertile|ovulat)|next\s+(?:period|regla)|\bmy\s+fertile|fertile\s+(?:window\s+)?ko\b/i;



const unique = <T>(items: T[]): T[] => [...new Set(items)];

function flowOf(text: string, hasPeriodWord: boolean): Flow | null {
  return FLOW.find((f) => f.pattern.test(text) && (f.alone || hasPeriodWord))?.flow ?? null;
}

function activitiesOf(text: string): Activity[] {
  const done = text.split(CLAUSE).filter((c) => !NEGATED.test(c));
  return ACTIVITIES.filter((a) => done.some((c) => ACTIVITY[a].test(c)));
}

const NOT_PREGNANT = /\b(?:nag-?)?(?:pt|pregnancy\s+test)\b[^.?]*\bnegative\b|\b(?:hindi|di)\s+(?:na\s+)?(?:ako\s+)?buntis\b|\b(?:i'?m|i\s+am)\s+not\s+pregnant\b|\bnegative\s+(?:ang\s+)?(?:pt|pregnancy\s+test)|\b(?:pt|pregnancy\s+test)\s+(?:ko\s+)?(?:ay\s+)?negative\b/i;
const UNSURE = /\b(?:baka|siguro|maybe|might\s+be|parang|kung)\s+(?:(?:na|ay)\s+)?(?:buntis|pregnant)\b/i;
const PREGNANT = /\bbuntis\s+(?:na\s+)?ako\b|\bako\s+(?:ay\s+)?buntis\b|\bnagdadalang-?tao\s+(?:na\s+)?ako\b|\b(?:i'?m|i\s+am)\s+pregnant\b|\bpositive\s+(?:ang\s+)?(?:pt|pregnancy\s+test)|\b(?:nag-?)?(?:pt|pregnancy\s+test)\b[^.?]*\bpositive\b|\b(?:pt|pregnancy\s+test)\s+(?:ko\s+)?(?:ay\s+)?positive\b/i;
const GAVE_BIRTH = /\bnanganak\s+na\s+ako\b|\bkaka-?panganak\s+ko\s+lang\b|\bkapapanganak\s+ko\s+lang\b|\bi\s+(?:just\s+)?gave\s+birth\b|\bi\s+(?:just\s+)?had\s+(?:my|the)\s+baby\b/i;

function statusOf(text: string): 'pregnant' | 'postpartum' | 'neither' | null {
  if (GAVE_BIRTH.test(text)) return 'postpartum';
  if (NOT_PREGNANT.test(text)) return 'neither';
  if (PREGNANT.test(text) && !UNSURE.test(text)) return 'pregnant';
  return null;
}

const NOT_A_NAME = /^(?:later|back|soon|tomorrow|tonight|now|anytime|again|when|if|not|na|a|an|the|nothing|none|maybe|mamaya|bukas|ulit|kapag|pag|baby|mommy|mama|anything|whatever)\b/i;
const RENAME =
  /^\s*(?:(?:please|pls|liora,?)\s+)*(?:(?:change|update|set)\s+my\s+name\s+(?:to|as|into)|call\s+me|my\s+name\s+is|tawagin\s+mo\s+(?:akong|ako\s+na|na\s+lang\s+akong)|palitan\s+mo\s+(?:ang\s+)?pangalan\s+ko\s+(?:ng|sa|to|into)|(?:ang\s+)?pangalan\s+ko\s+ay)\s+([\p{L}][\p{L}' .-]{0,38}?)(?:\s+(?:po|na\s+lang|nalang|please|instead))*[\s.!]*$/iu;

// "Call me Bea": her new name, as she wrote it, or null.
export function readRename(text: string): string | null {
  const name = RENAME.exec(text)?.[1]?.trim();
  return name && name.split(/\s+/).length <= 3 && !NOT_A_NAME.test(name) ? name : null;
}

export function readActions(text: string, today: string): AgentAction[] {
  const rename = readRename(text);
  if (rename) return [{ tool: 'set_name', name: rename }];
  if (GREETING_ONLY.test(text) && text.trim()) return [{ tool: 'smalltalk' }];
  const memory = readMemory(text);
  if (memory) return memory;
  const edit = readEdit(text, today);
  // "Log headache and open calendar": a shortcut never hides the log that came with it.
  const opens = edit?.every((a) => a.tool === 'open') ? edit : [];
  if (edit && opens.length === 0) return edit;
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

  // "Normal ba sumakit likod pag buntis?": a question about a symptom is not a log of it.
  const told = statements(text);
  const symptoms = unique(readText(told).map((f) => f.code)).filter((c): c is Symptom => (SYMPTOMS as readonly string[]).includes(c));
  if (symptoms.length) out.push({ tool: 'symptoms', date: dateWord(text, now, today), symptoms });
  // Her own statement of where she is: never a question, and the planner always asks before changing it.
  const stated = question ? null : statusOf(text);
  if (stated) out.push({ tool: 'set_status', status: stated });
  const discharge = question ? null : readDischarge(text);
  if (discharge) out.push({ tool: 'discharge', date: dateWord(text, now, today), discharge });
  const moods = readMoods(told);
  if (moods.length) out.push({ tool: 'moods', date: dateWord(text, now, today), moods });
  const activities = question ? [] : activitiesOf(text);
  if (activities.length) out.push({ tool: 'activities', date: dateWord(text, now, today), activities });
  // "2 weeks na mula nanganak ako" counts time since birth, not weeks pregnant.
  const weeks = SINCE_BIRTH.test(text) ? null : readWeeks(text);
  if (weeks !== null) out.push({ tool: 'weeks', weeks });

  // "Kahapon at ngayon": the same log on both days.
  if (BOTH_DAYS.test(text) && YESTERDAY.test(text)) {
    for (const a of [...out]) {
      if ((a.tool === 'symptoms' || a.tool === 'moods' || a.tool === 'activities' || a.tool === 'discharge') && a.date.kind === 'yesterday') {
        out.splice(out.indexOf(a) + 1, 0, { ...a, date: { kind: 'today' } });
      }
    }
  }
  if (opens.length > 0) {
    out.push(...opens);
    return out;
  }
  if (CONTACT.test(text)) out.push({ tool: 'contact' });
  else if (cycleQuestion) out.push({ tool: 'cycle_question' });
  else if (question) out.push(HEALTH.test(text) || out.length > 0 ? { tool: 'health_question' } : { tool: 'smalltalk' });
  if (out.length === 0 && (THANKS.test(text) || ACK.test(text))) out.push({ tool: 'smalltalk' });
  // "Kulang ang gatas ko", "baka buntis ako": about her health, with nothing to log, so a card is looked for.
  else if (out.length === 0 && HEALTH.test(text) && WORRY.test(text) && readText(text).length === 0) out.push({ tool: 'health_question' });
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
