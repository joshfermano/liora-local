import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { cycleDay, cycleHistory, periodLength, predictNext } from '../cycle';
import type { Context, CycleSettings, DayLog, Entry, Mood, MoodResult, PeriodRecord } from '../types';
import { DANGER_CODES, MOODS } from '../vocabulary';

// Today's glance and "Liora noticed": counts and lengths from her own logs, never advice.
export interface InsightInput {
  entries: Entry[];
  moodChecks: MoodResult[];
  periods: PeriodRecord[];
  cycleSettings: CycleSettings;
  status: Context['status'] | undefined;
  today: string;
  dayLogs?: DayLog[];
}

export interface StripDay {
  date: string;
  isToday: boolean;
  period: 'logged' | 'estimated' | null;
  checkIns: number;
}

export interface Glance {
  strip: StripDay[];
  checkIns: { total: number; go_now: number; follow_up: number; ok: number };
  moods: { mood: Mood; count: number }[];
  cycle: { day: number | null; averageLength: number | null; lastLength: number | null; periodLength: number | null } | null;
}

export type Insight =
  | { kind: 'cycle_length'; days: number; cycles: number }
  | { kind: 'cycle_spread'; min: number; max: number }
  | { kind: 'last_cycle'; days: number; average: number }
  | { kind: 'period_length'; days: number; periods: number }
  | { kind: 'recurring'; code: string; danger: boolean; count: number; withinDays: number }
  | { kind: 'mood_pattern'; mood: Mood; count: number; withinDays: number }
  | { kind: 'mood_check'; daysSince: number | null };

const WEEK = 7;
const RECUR_DAYS = 14;
const MOOD_CHECK_EVERY = 14;
const MAX_RECENT = 6;

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const shift = (day: string, n: number) => fmt(addDays(parseISO(day), n));
const dayOf = (iso: string) => fmt(parseISO(iso));
const within = (iso: string, today: string, days: number) => {
  const d = dayOf(iso);
  return d <= today && d > shift(today, -days);
};
const isDanger = (code: string) => (DANGER_CODES as readonly string[]).includes(code);
const average = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

export function periodDays(periods: PeriodRecord[]): number[] {
  return periods
    .filter((p): p is PeriodRecord & { end: string } => p.end !== null)
    .map((p) => differenceInCalendarDays(parseISO(p.end), parseISO(p.start)) + 1)
    .filter((n) => n > 0);
}

// A period with no end yet is drawn for her usual length, never past today.
export function loggedOn(periods: PeriodRecord[], usual: number, day: string, today: string): boolean {
  return periods.some((p) => {
    const end = p.end ?? [shift(p.start, usual - 1), today].sort()[0]!;
    return p.start <= day && day <= end;
  });
}

// Newest first; only cycles with both ends logged.
export const recentLengths = (periods: PeriodRecord[]) =>
  cycleHistory(periods)
    .map((c) => c.length)
    .filter((n): n is number => n !== null)
    .slice(0, MAX_RECENT);

// Days on which each code was logged, whether she told Liora or tapped it in the day log; a day
// counts once however many times she mentioned it.
function daysWith(
  entries: Entry[],
  dayLogs: DayLog[],
  today: string,
  days: number,
  fromEntry: (e: Entry) => readonly string[],
  fromLog: (l: DayLog) => readonly string[],
): Map<string, number> {
  const seen = new Map<string, Set<string>>();
  const add = (code: string, date: string) => seen.set(code, (seen.get(code) ?? new Set()).add(date));
  for (const e of entries) if (within(e.created_at, today, days)) for (const c of fromEntry(e)) add(c, dayOf(e.created_at));
  for (const l of dayLogs) if (l.date <= today && l.date > shift(today, -days)) for (const c of fromLog(l)) add(c, l.date);
  return new Map([...seen].map(([code, dates]) => [code, dates.size]));
}

function moodCounts(entries: Entry[], today: string, dayLogs: DayLog[] = []): { mood: Mood; count: number }[] {
  const counts = daysWith(entries, dayLogs, today, WEEK, (e) => e.extraction?.moods ?? [], (l) => l.moods) as Map<Mood, number>;
  return [...counts]
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count || MOODS.indexOf(a.mood) - MOODS.indexOf(b.mood));
}

export function glance({ entries, periods, cycleSettings, status, today, dayLogs }: InsightInput): Glance {
  const pregnant = status === 'pregnant';
  const prediction = pregnant ? null : predictNext(periods, cycleSettings, today, status ?? 'neither');
  const usual = periodLength(periods, cycleSettings);
  const strip = Array.from({ length: WEEK }, (_, i) => {
    const date = shift(today, i - 3);
    const logged = loggedOn(periods, usual, date, today);
    const estimated = !logged && prediction !== null && prediction.window.from <= date && date <= prediction.window.to;
    return {
      date,
      isToday: date === today,
      period: logged ? ('logged' as const) : estimated ? ('estimated' as const) : null,
      checkIns: entries.filter((e) => dayOf(e.created_at) === date).length,
    };
  });

  const week = entries.filter((e) => within(e.created_at, today, WEEK));
  const checkIns = {
    total: week.length,
    go_now: week.filter((e) => e.decision.level === 'go_now').length,
    follow_up: week.filter((e) => e.decision.level === 'follow_up').length,
    ok: week.filter((e) => e.decision.level === 'ok').length,
  };

  const lengths = recentLengths(periods);
  const days = periodDays(periods);
  const cycle = pregnant
    ? null
    : {
        day: cycleDay(periods, today),
        averageLength: lengths.length > 0 ? average(lengths) : null,
        lastLength: lengths[0] ?? null,
        periodLength: days.length > 0 ? average(days) : null,
      };

  return { strip, checkIns, moods: moodCounts(entries, today, dayLogs), cycle };
}

export function insights({ entries, moodChecks, periods, status, today, dayLogs }: InsightInput): Insight[] {
  const found: Insight[] = [];

  const mentions = daysWith(entries, dayLogs ?? [], today, RECUR_DAYS, (e) => e.findings.map((f) => f.code), (l) => l.symptoms);
  const recurring = [...mentions]
    .filter(([, count]) => count >= 2)
    .map(([code, count]) => ({ kind: 'recurring' as const, code, danger: isDanger(code), count, withinDays: RECUR_DAYS }))
    .sort((a, b) => Number(b.danger) - Number(a.danger) || b.count - a.count);
  found.push(...recurring.filter((r) => r.danger));

  if (status !== 'pregnant') {
    const lengths = recentLengths(periods);
    if (lengths.length >= 2) found.push({ kind: 'cycle_length', days: average(lengths), cycles: lengths.length });
    if (lengths.length >= 3) {
      found.push({ kind: 'cycle_spread', min: Math.min(...lengths), max: Math.max(...lengths) });
      const avg = average(lengths);
      if (Math.abs(lengths[0]! - avg) >= 3) found.push({ kind: 'last_cycle', days: lengths[0]!, average: avg });
    }
    const days = periodDays(periods);
    if (days.length >= 2) found.push({ kind: 'period_length', days: average(days), periods: days.length });
  }

  found.push(...recurring.filter((r) => !r.danger).slice(0, 3));

  const [topMood] = moodCounts(entries, today, dayLogs);
  if (topMood && topMood.count >= 2) found.push({ kind: 'mood_pattern', ...topMood, withinDays: WEEK });

  const last = moodChecks.map((m) => dayOf(m.created_at)).sort().at(-1);
  if (!last) {
    if (entries.length >= 3) found.push({ kind: 'mood_check', daysSince: null });
  } else {
    const since = differenceInCalendarDays(parseISO(today), parseISO(last));
    if (since >= MOOD_CHECK_EVERY) found.push({ kind: 'mood_check', daysSince: since });
  }

  return found;
}
