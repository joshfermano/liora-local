import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { fertileWindows } from '../calendar';
import { cycleHistory, cycleDay, predictNext } from '../cycle';
import { readMoods, readText } from '../lexicon';
import type { DayLog, Mood, Symptom } from '../types';
import { SYMPTOMS } from '../vocabulary';
import { periodCovering } from './fit';
import type { AgentData } from './types';

// Questions about her own logs, answered from those logs with fixed words: the numbers come from
// her data and the cycle estimate, never from a model. Input patterns only.
const DAYS_UNTIL =
  /\b(?:ilang\s+araw\s+pa|how\s+many\s+days\s+(?:until|till|before|left)|days?\s+(?:until|till|left\s+(?:until|before)))\b.*\b(?:regla|periods?|mens|dalaw)\b/i;
const CYCLE_DAY = /\bcycle\s+day\b|\bday\s+(?:of|ng)\s+(?:my\s+)?cycle\b|\bpang-?ilang\s+araw\b|\bwhat\s+day\s+of\s+my\s+cycle\b/i;
const LAST_PERIOD =
  /\b(?:kailan|kelan|when)\b.*\b(?:huling|last|nakaraang|previous|latest)\s+(?:na\s+)?(?:regla|periods?|mens)\b|\b(?:huling|last)\s+(?:regla|period|mens)\s+(?:ko\s+)?(?:kailan|kelan|when)\b/i;
const CYCLE_LENGTH = /\b(?:gaano\s+kahaba|how\s+long|average|karaniwang\s+haba|haba)\b.*\bcycle\b|\bcycle\s+length\b|\bcycle\s+ko\s+(?:ay\s+)?ilang\s+araw\b/i;
const PERIOD_LENGTH =
  /\b(?:ilang\s+araw|how\s+(?:long|many\s+days)|gaano\s+katagal)\b(?:(?!\bpa\b|\bbago\b|\buntil\b|\bnext\b).)*\b(?:regla|periods?|mens)\b|\b(?:regla|period|mens)\s+(?:ko\s+)?(?:usually\s+)?(?:lasts?|tumatagal)\b/i;
const REGULAR = /\b(?:ir)?regular\b.*\b(?:cycle|regla|periods?|mens)\b|\b(?:cycle|regla|periods?|mens)\b.*\b(?:ir)?regular\b/i;
const OVULATING_NOW =
  /\bam\s+i\s+ovulating\b|\bdo\s+i\s+(?:have|get)\s+(?:my\s+|an?\s+)?ovulation\b|\b(?:nag-?o-?ovulate|nag-?oovulate|ovulating)\s+ba\s+ako\b|\bovulation\s+(?:ko\s+)?(?:ba\s+)?ngayon\b|\bmay\s+ovulation\s+ba\s+ako\b|\bovulating\s+(?:now|today)\b/i;
const FERTILE_NOW = /\bfertile\s+ba\s+ako\b|\bam\s+i\s+fertile\b|\bfertile\b.*\b(?:ngayon|today|now)\b|\b(?:ngayon|today)\b.*\bfertile\b/i;
const LATE = /\blate\s+ba\s+(?:ako|ang\s+regla|regla)\b|\bam\s+i\s+late\b|\bdelay(?:ed)?\s+ba\s+(?:ako|ang\s+regla)\b|\bis\s+my\s+period\s+late\b/i;
const PERIOD_DAY =
  /\bilang\s+araw\s+na\s+(?:ako\s+)?(?:may\s+|nagkaka)?(?:regla|mens|dalaw)\b|\bhow\s+(?:many\s+days|long)\s+have\s+i\s+(?:been\s+on|had)\s+my\s+period\b|\bwhat\s+day\s+of\s+my\s+period\b|\bpang-?ilang\s+araw\s+(?:na\s+)?(?:ng\s+)?(?:regla|mens)\b/i;
const ON_PERIOD =
  /\bmay\s+(?:regla|mens|dalaw)\s+ba\s+ako\b|\bnasa\s+(?:period|regla)\s+ba\s+ako\b|\bam\s+i\s+on\s+my\s+period\b|\bnireregla\s+ba\s+ako\b/i;
const LAST_SIGN = /\b(?:kailan|kelan|when)\b.*\b(?:huli(?:ng)?|last)\b|\b(?:huli(?:ng)?|last)\b.*\b(?:kailan|kelan|when)\b/i;
// About her own history, not "how often should I take…".
const HOW_OFTEN =
  /\bilang\s+beses\s+(?:na\s+)?(?:ako|akong|ko)\b|\bhow\s+many\s+times\s+(?:have|did|do)\s+i\b|\bhow\s+often\s+(?:do|did|have)\s+i\b|\bgaano\s+(?:ako\s+)?kadalas\s+(?:ako\s+)?(?:nag|sumakit|nagka)/i;
const MOODS_LATELY =
  /\bhow\s+(?:have|has)\s+i\s+been\s+feeling\b|\b(?:mood|moods|nararamdaman|feelings?)\s+(?:ko\s+)?(?:lately|nitong\s+mga\s+araw|this\s+week|ngayong\s+linggo)\b|\bkumusta\s+(?:ang\s+)?mood\s+ko\b|\bmy\s+moods?\s+(?:lately|recently|this\s+week)\b/i;
const WEEK =
  /\b(?:this|last|past)\s+week\b|\b(?:ngayong|nitong|noong\s+isang)\s+linggo\b|\blast\s+7\s+days\b|\bnakaraang\s+(?:linggo|7\s+araw)\b/i;
const LOGS = /\bnilog|na-?log|logged|\blogs?\b|naitala|\btinala\b/i;
const MONTH = /\b(?:this|last|past)\s+month\b|\bngayong\s+buwan\b|\bnitong\s+buwan\b/i;
const ASKS = /\?|\bba\b|^\s*(?:show|tell\s+me|list|ipakita|ano|anong|kailan|kelan|ilang|ilan|gaano|paano|nasa|am|is|was|do|did|have|how|what|when|which)\b/i;

export interface HerAnswer {
  key: string;
  params?: Record<string, string>;
  // Codes the store turns into her words.
  symptoms?: Symptom[];
  moods?: Mood[];
  days?: DayLog[];
}

const day = (iso: string) => format(parseISO(iso), 'MMM d');
const shift = (iso: string, n: number) => format(addDays(parseISO(iso), n), 'yyyy-MM-dd');

function namedSymptoms(text: string): Symptom[] {
  const codes = readText(text).map((f) => f.code);
  return [...new Set(codes.filter((c): c is Symptom => (SYMPTOMS as readonly string[]).includes(c)))];
}

function cycleAnswer(text: string, data: AgentData, today: string): HerAnswer | null {
  const starts = data.periods.map((p) => p.start).filter((s) => s <= today).sort();
  const last = starts.at(-1);
  if (PERIOD_DAY.test(text)) {
    const now = periodCovering(today, data, today);
    return now ? { key: 'her.period_day', params: { n: String(differenceInCalendarDays(parseISO(today), parseISO(now.start)) + 1), date: day(now.start) } } : { key: 'her.on_period.no' };
  }
  if (ON_PERIOD.test(text)) {
    const now = periodCovering(today, data, today);
    return now ? { key: 'her.on_period.yes', params: { date: day(now.start) } } : { key: 'her.on_period.no' };
  }
  if (!last) {
    const asks = CYCLE_DAY.test(text) || LAST_PERIOD.test(text) || CYCLE_LENGTH.test(text) || REGULAR.test(text) || LATE.test(text) || FERTILE_NOW.test(text) || DAYS_UNTIL.test(text) || PERIOD_LENGTH.test(text);
    return asks ? { key: 'her.no_periods' } : null;
  }
  if (LAST_PERIOD.test(text)) return { key: 'her.last_period', params: { date: day(last) } };
  if (CYCLE_DAY.test(text)) return { key: 'her.cycle_day', params: { n: String(cycleDay(data.periods, today)) } };
  const lengths = cycleHistory(data.periods)
    .map((c) => c.length)
    .filter((n): n is number => n !== null)
    .slice(0, 6);
  if (REGULAR.test(text)) {
    if (lengths.length < 2) return { key: 'her.cycle_few' };
    return { key: 'her.cycle_range', params: { k: String(lengths.length), min: String(Math.min(...lengths)), max: String(Math.max(...lengths)) } };
  }
  if (CYCLE_LENGTH.test(text)) {
    if (lengths.length === 0) return { key: 'her.cycle_few' };
    const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
    return lengths.length === 1 ? { key: 'her.cycle_length.one', params: { n: String(avg) } } : { key: 'her.cycle_length', params: { n: String(avg), k: String(lengths.length) } };
  }
  const next = predictNext(data.periods, data.cycleSettings, today, 'neither');
  if (LATE.test(text)) {
    if (!next) return { key: 'her.cycle_few' };
    const past = differenceInCalendarDays(parseISO(today), parseISO(next.window.to));
    if (periodCovering(today, data, today)) return { key: 'her.late.on_period', params: { date: day(last) } };
    return past > 0 ? { key: 'her.late.yes', params: { n: String(past), to: day(next.window.to) } } : { key: 'her.late.no', params: { date: day(next.next_start) } };
  }
  if (DAYS_UNTIL.test(text)) {
    if (!next) return { key: 'her.cycle_few' };
    const n = differenceInCalendarDays(parseISO(next.next_start), parseISO(today));
    return n > 0 ? { key: 'her.days_until', params: { n: String(n), date: day(next.next_start) } } : { key: 'her.late.no', params: { date: day(next.next_start) } };
  }
  if (OVULATING_NOW.test(text)) {
    const windows = fertileWindows({ periods: data.periods, cycleSettings: data.cycleSettings, status: 'neither', today, dayLogs: [], entries: [] });
    const now = windows.find((f) => f.ovulation.from <= today && today <= f.ovulation.to);
    if (now) return { key: 'her.ovulating.yes', params: { from: day(now.ovulation.from), to: day(now.ovulation.to) } };
    const ahead = windows.find((f) => f.ovulation.from > today);
    return ahead ? { key: 'her.ovulating.no', params: { from: day(ahead.ovulation.from), to: day(ahead.ovulation.to) } } : { key: 'her.fertile.unknown' };
  }
  if (FERTILE_NOW.test(text)) {
    const window = fertileWindows({ periods: data.periods, cycleSettings: data.cycleSettings, status: 'neither', today, dayLogs: [], entries: [] }).find((f) => f.to >= today);
    if (!window) return { key: 'her.fertile.unknown' };
    return today >= window.from ? { key: 'her.fertile.yes', params: { from: day(window.from), to: day(window.to) } } : { key: 'her.fertile.no', params: { from: day(window.from), to: day(window.to) } };
  }
  if (PERIOD_LENGTH.test(text)) {
    const ended = data.periods.filter((p) => p.end && p.end > p.start);
    if (ended.length === 0) return { key: 'her.period_length.unknown' };
    const avg = Math.round(ended.reduce((a, p) => a + differenceInCalendarDays(parseISO(p.end!), parseISO(p.start)) + 1, 0) / ended.length);
    return ended.length === 1 ? { key: 'her.period_length.one', params: { n: String(avg) } } : { key: 'her.period_length', params: { n: String(avg), k: String(ended.length) } };
  }
  return null;
}

function historyAnswer(text: string, data: AgentData, today: string): HerAnswer | null {
  const logged = [...data.dayLogs].filter((l) => l.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  const signs = namedSymptoms(text);
  if (signs.length > 0 && LAST_SIGN.test(text)) {
    const hit = logged.find((l) => l.symptoms.some((s) => signs.includes(s)));
    return hit ? { key: 'her.last_sign', params: { date: day(hit.date) }, symptoms: signs } : { key: 'her.never_sign', symptoms: signs };
  }
  if (signs.length > 0 && HOW_OFTEN.test(text)) {
    const from = MONTH.test(text) ? `${today.slice(0, 7)}-01` : WEEK.test(text) ? shift(today, -6) : shift(today, -29);
    const n = logged.filter((l) => l.date >= from && l.symptoms.some((s) => signs.includes(s))).length;
    return { key: n === 1 ? 'her.count_sign.one' : 'her.count_sign', params: { n: String(n), from: day(from) }, symptoms: signs };
  }
  if (MOODS_LATELY.test(text)) {
    const from = shift(today, -6);
    const moods = [...new Set(logged.filter((l) => l.date >= from).flatMap((l) => l.moods))];
    return moods.length > 0 ? { key: 'her.moods', moods } : { key: 'her.moods.none' };
  }
  if (WEEK.test(text) && LOGS.test(text)) {
    const from = shift(today, -6);
    const days = logged.filter((l) => l.date >= from && (l.flow || l.symptoms.length || l.moods.length || l.activities.length || l.note));
    return days.length > 0 ? { key: 'her.week', days } : { key: 'her.week.none' };
  }
  return null;
}

export function herAnswer(text: string, data: AgentData, status: string | undefined, today: string): HerAnswer | null {
  if (!ASKS.test(text) || readMoods(text).length > 0 && !MOODS_LATELY.test(text)) return null;
  const history = historyAnswer(text, data, today);
  if (history) return history;
  if (status !== 'neither' && status !== undefined) return null;
  return cycleAnswer(text, data, today);
}
