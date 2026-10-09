import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { estimatedPeriods, fertileWindows, type FertileWindow } from '../calendar';
import { cycleDay, cycleHistory, periodLength, predictNext } from '../cycle';
import { insights, loggedOn, periodDays, recentLengths, type Insight, type InsightInput } from '../insights';
import type { DayLog, Prediction } from '../types';

// Everything the Today tab shows, worked out from her logs on the phone. Counts and dates only.
export interface TodayInput extends InsightInput {
  dayLogs: DayLog[];
  weeks?: number | null;
}

export type Confidence = Prediction['confidence'];

export type Answer =
  | { kind: 'first_run' }
  | { kind: 'pregnant'; weeks: number | null }
  | { kind: 'postpartum' }
  | { kind: 'period'; day: number }
  | { kind: 'countdown'; from: number; to: number; cycleDay: number | null; confidence: Confidence; basis: Prediction['basis'] }
  | { kind: 'any_day'; cycleDay: number | null; confidence: Confidence; basis: Prediction['basis'] }
  | { kind: 'past_window'; cycleDay: number; confidence: Confidence; basis: Prediction['basis'] }
  | { kind: 'cycle_day'; cycleDay: number };

export interface StripDay {
  date: string;
  isToday: boolean;
  period: 'logged' | 'estimated' | null;
}

export type DotKind = 'period' | 'estimated' | 'day' | 'ahead';

export interface CycleRow {
  start: string;
  end: string | null; // null for the cycle she is in now
  length: number | null; // days, for finished cycles
  day: number | null; // today's cycle day, for the current cycle
  dots: DotKind[];
}

export interface TodayModel {
  answer: Answer;
  strip: StripDay[]; // this week and next, from Sunday
  next: (Prediction & { inDays: number }) | null;
  cycles: {
    length: { min: number; max: number; average: number; count: number } | null;
    period: { average: number; count: number } | null;
    last: number | null;
    symptomsThisCycle: number;
  } | null; // null while pregnant or after birth
  rows: CycleRow[]; // up to 3, newest first
  loggedToday: { period: boolean; symptoms: boolean; mood: boolean; any: boolean };
  gapQuestion: { since: string; days: number } | null; // a cycle running about twice her usual length
  fertile: FertileWindow | null; // the current or next estimated window; an estimate, not contraception
  patterns: Insight[];
  cyclesLogged: number;
  // Everything she logged today, from the day log and from what she told Liora; shown in any status.
  todayLog: { flow: DayLog['flow']; symptoms: string[]; moods: string[]; activities: string[]; note: string | null };
}

const MAX_DOTS = 45;
const ROWS = 3;

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const shift = (day: string, n: number) => fmt(addDays(parseISO(day), n));
const between = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a));
const dayOf = (iso: string) => fmt(parseISO(iso));
const average = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

export function today(input: TodayInput): TodayModel {
  const { entries, moodChecks, periods, cycleSettings, dayLogs, status, today: now } = input;
  const tracking = status !== 'pregnant' && status !== 'postpartum';
  const usual = periodLength(periods, cycleSettings);
  const prediction = tracking ? predictNext(periods, cycleSettings, now, 'neither') : null;
  const lengths = recentLengths(periods);
  const lastStart = periods.map((p) => p.start).filter((s) => s <= now).sort().at(-1) ?? null;
  const day = cycleDay(periods, now);
  const onPeriod = loggedOn(periods, usual, now, now);

  const answer = ((): Answer => {
    if (status === 'pregnant') return { kind: 'pregnant', weeks: input.weeks ?? null };
    if (status === 'postpartum') return { kind: 'postpartum' };
    if (!lastStart || day === null) return { kind: 'first_run' };
    if (onPeriod) return { kind: 'period', day };
    if (!prediction) return { kind: 'cycle_day', cycleDay: day };
    const { window, confidence, basis } = prediction;
    if (now < window.from) return { kind: 'countdown', from: between(now, window.from), to: between(now, window.to), cycleDay: day, confidence, basis };
    if (now <= window.to) return { kind: 'any_day', cycleDay: day, confidence, basis };
    return { kind: 'past_window', cycleDay: day, confidence, basis };
  })();

  const sunday = fmt(startOfWeek(parseISO(now), { weekStartsOn: 0 }));
  // The same dashed days as the calendar: her likely period days, not the whole window.
  const ahead = tracking ? estimatedPeriods(input) : [];
  const estimated = (date: string) => ahead.some((e) => e.start <= date && date <= e.end);
  const strip = Array.from({ length: 14 }, (_, i) => {
    const date = shift(sunday, i);
    const logged = loggedOn(periods, usual, date, now);
    return { date, isToday: date === now, period: logged ? ('logged' as const) : estimated(date) ? ('estimated' as const) : null };
  });

  const next = prediction && now <= prediction.window.to ? { ...prediction, inDays: between(now, prediction.next_start) } : null;

  const sinceStart = (date: string) => lastStart !== null && date >= lastStart && date <= now;
  const symptomsThisCycle = dayLogs.filter((d) => sinceStart(d.date)).reduce((n, d) => n + d.symptoms.length, 0);
  const bled = periodDays(periods);
  const cycles = tracking
    ? {
        length: lengths.length > 0 ? { min: Math.min(...lengths), max: Math.max(...lengths), average: average(lengths), count: lengths.length } : null,
        period: bled.length > 0 ? { average: average(bled), count: bled.length } : null,
        last: lengths[0] ?? null,
        symptomsThisCycle,
      }
    : null;

  const rows: CycleRow[] = tracking
    ? cycleHistory(periods)
        .filter((c) => c.start <= now)
        .slice(0, ROWS)
        .map((c) => {
          if (c.length !== null) {
            const dots = Array.from({ length: Math.min(c.length, MAX_DOTS) }, (_, i): DotKind =>
              loggedOn(periods, usual, shift(c.start, i), now) ? 'period' : 'day',
            );
            return { start: c.start, end: shift(c.start, c.length - 1), length: c.length, day: null, dots };
          }
          const sofar = between(c.start, now) + 1;
          const expected = prediction ? between(c.start, prediction.next_start) : 0;
          const dots = Array.from({ length: Math.min(Math.max(sofar, expected), MAX_DOTS) }, (_, i): DotKind => {
            const date = shift(c.start, i);
            if (date <= now) return loggedOn(periods, usual, date, now) ? 'period' : 'day';
            return estimated(date) ? 'estimated' : 'ahead';
          });
          return { start: c.start, end: null, length: null, day: sofar, dots };
        })
    : [];

  const todayLog = dayLogs.find((d) => d.date === now);
  const unique = (xs: string[]) => [...new Set(xs)];
  const todayEntries = entries.filter((e) => dayOf(e.created_at) === now);
  const loggedToday = {
    period: onPeriod || Boolean(todayLog?.flow),
    // The day log is the record she edits; the agent saves what she says into it.
    symptoms: (todayLog?.symptoms.length ?? 0) > 0,
    mood:
      (todayLog?.moods.length ?? 0) > 0 ||
      todayEntries.some((e) => (e.extraction?.moods.length ?? 0) > 0) ||
      moodChecks.some((m) => dayOf(m.created_at) === now),
    any: Boolean(todayLog) || todayEntries.length > 0,
  };

  const usualCycle = lengths.length > 0 ? average(lengths) : cycleSettings.stated_cycle_length;
  const gapQuestion =
    tracking && lastStart && day !== null && usualCycle && day >= usualCycle * 2 ? { since: lastStart, days: day } : null;

  const fertile = tracking ? (fertileWindows(input).find((f) => f.to >= now) ?? null) : null;

  const logged = {
    flow: todayLog?.flow ?? null,
    symptoms: [...(todayLog?.symptoms ?? [])],
    moods: unique([...(todayLog?.moods ?? []), ...todayEntries.flatMap((e) => e.extraction?.moods ?? [])]),
    activities: [...(todayLog?.activities ?? [])],
    note: todayLog?.note ?? null,
  };

  return { answer, strip, next, cycles, rows, loggedToday, gapQuestion, fertile, patterns: insights(input), cyclesLogged: lengths.length, todayLog: logged };
}
