import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import type { DateWord } from './types';

const DAYS_AGO = /(\d{1,2})\s*(?:araw\s+na|days?\s+ago|araw\s+(?:ang\s+)?(?:nakaraan|nakalipas))/i;
const ISO_DATE = /\b(\d{4}-\d{2}-\d{2})\b/;

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6,
  july: 7, jul: 7, august: 8, aug: 8, september: 9, sept: 9, sep: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
  enero: 1, pebrero: 2, marso: 3, abril: 4, mayo: 5, hunyo: 6, hulyo: 7, agosto: 8,
  setyembre: 9, oktubre: 10, nobyembre: 11, disyembre: 12,
};
const NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const NOT_A_COUNT = String.raw`(?!\d|\s*(?:araw|days?|weeks?|linggo|na\b))`;
const MONTH_DAY = new RegExp(String.raw`\b(${NAMES})\.?\s+(\d{1,2})${NOT_A_COUNT}`, 'i');
const DAY_MONTH = new RegExp(String.raw`\b(\d{1,2})\s+(?:ng\s+)?(${NAMES})\b`, 'i');

function namedDate(text: string, today: string): string | null {
  const a = MONTH_DAY.exec(text);
  const b = a ? null : DAY_MONTH.exec(text);
  const name = a?.[1] ?? b?.[2];
  const day = Number(a?.[2] ?? b?.[1]);
  if (!name) return null;
  const year = Number(today.slice(0, 4));
  const at = (y: number) => `${y}-${String(MONTHS[name.toLowerCase()]).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  for (const y of [year, year - 1]) {
    const d = parseISO(at(y));
    if (isValid(d) && format(d, 'yyyy-MM-dd') === at(y) && at(y) <= today) return at(y);
  }
  return null;
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, linggo: 0, monday: 1, mon: 1, lunes: 1, tuesday: 2, tue: 2, tues: 2, martes: 2, wednesday: 3, wed: 3, miyerkules: 3, miyerkoles: 3,
  thursday: 4, thu: 4, thurs: 4, huwebes: 4, friday: 5, fri: 5, biyernes: 5, saturday: 6, sat: 6, sabado: 6,
};
// "Last monday", "noong Lunes": the latest such day before today. "Linggo" alone means a week, so it needs "noong".
const WEEKDAY = /\b(?:last|nung|noong|nitong|this\s+past|on)\s+(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thu|friday|fri|saturday|sat|lunes|martes|miyerkules|miyerkoles|huwebes|biyernes|sabado|linggo)\b/i;

function weekdayDate(text: string, today: string): string | null {
  const m = WEEKDAY.exec(text);
  if (!m) return null;
  // "Nitong linggo" is "this week", not "this Sunday".
  if (m[1]!.toLowerCase() === 'linggo' && /^nitong$/i.test(m[0].split(/\s+/)[0]!)) return null;
  const want = WEEKDAYS[m[1]!.toLowerCase()]!;
  const now = parseISO(today);
  const back = ((now.getDay() - want + 7) % 7) || 7;
  return format(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back), 'yyyy-MM-dd');
}

export function dateWord(text: string, fallback: DateWord, today: string): DateWord {
  const iso = ISO_DATE.exec(text);
  if (iso) return { kind: 'date', date: iso[1]! };
  const weekday = weekdayDate(text, today);
  if (weekday) return { kind: 'date', date: weekday };
  const named = namedDate(text, today);
  if (named) return { kind: 'date', date: named };
  if (/\b(?:kahapon|yesterday)\b/i.test(text)) return { kind: 'yesterday' };
  const ago = DAYS_AGO.exec(text);
  if (ago) return { kind: 'days_ago', n: Number(ago[1]) };
  if (/\b(?:ngayon|today|kanina)\b/i.test(text)) return { kind: 'today' };
  return fallback;
}

// A named day still ahead this year ("sa Oct 20" on Oct 10): she means a plan, not last year.
export function namesComingDate(text: string, today: string): boolean {
  const a = MONTH_DAY.exec(text);
  const b = a ? null : DAY_MONTH.exec(text);
  const name = a?.[1] ?? b?.[2];
  const day = Number(a?.[2] ?? b?.[1]);
  if (!name) return false;
  const iso = `${today.slice(0, 4)}-${String(MONTHS[name.toLowerCase()]).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const d = parseISO(iso);
  return isValid(d) && iso > today && differenceInCalendarDays(d, parseISO(today)) <= 90;
}
