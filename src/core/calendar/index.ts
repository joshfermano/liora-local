import { addDays, differenceInCalendarDays, format, getDaysInMonth, parseISO } from 'date-fns';
import { cycleLengths, periodLength, predictNext, withoutForgottenPeriods } from '../cycle';
import type { Context, CycleSettings, DayLog, Entry, PeriodRecord, Prediction } from '../types';

// The calendar's marks, worked out from her logs on the phone. Solid is what she logged; dashed is
// Liora's estimate. Nothing is estimated during a pregnancy or after birth.
export interface CalendarInput {
  periods: PeriodRecord[];
  cycleSettings: CycleSettings;
  status: Context['status'] | undefined;
  today: string;
  dayLogs: DayLog[];
  entries: Entry[];
}

export interface EstimatedPeriod {
  start: string;
  end: string;
  window: Prediction['window'];
  confidence: Prediction['confidence'];
}

export interface FertileWindow {
  from: string;
  to: string;
  ovulation: { from: string; to: string };
  confidence: Prediction['confidence'];
}

export interface DayMark {
  date: string;
  isToday: boolean;
  future: boolean;
  period: 'logged' | 'estimated' | null;
  fertile: 'window' | 'ovulation' | null; // an estimate, never contraception
  periodDay: number | null; // 1 for the first day of a logged or estimated period
  cycleDay: number | null;
  hasLog: boolean; // a day log or a check-in with Liora on that day
}

export interface DayDetail {
  mark: DayMark;
  estimate: EstimatedPeriod | null; // the estimate this day falls in, if any
  log: DayLog | null;
  checkIns: number;
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const shift = (day: string, n: number) => fmt(addDays(parseISO(day), n));
const between = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a));
const dayOf = (iso: string) => fmt(parseISO(iso));
const STEPS: Prediction['confidence'][] = ['high', 'medium', 'low'];
const MAX_LOOKAHEAD = 24;

export function usualLength(periods: PeriodRecord[], settings: CycleSettings): number {
  return periodLength(periods, settings);
}

// Ahead, each estimate's window widens by a day and its confidence steps down; when her cycles
// vary, only the next one is drawn.
export function estimatedPeriods(input: CalendarInput, count = 3): EstimatedPeriod[] {
  const { periods, cycleSettings, status, today } = input;
  if (status === 'pregnant' || status === 'postpartum') return [];
  const prediction = predictNext(periods, cycleSettings, today, 'neither');
  if (!prediction) return [];
  const last = periods.map((p) => p.start).sort().at(-1)!;
  const cycle = between(last, prediction.next_start);
  const half = between(prediction.window.from, prediction.next_start);
  const usual = usualLength(periods, cycleSettings);
  const wanted = prediction.confidence === 'high' ? count : 1;
  const ahead: EstimatedPeriod[] = [];
  for (let k = 0; k < MAX_LOOKAHEAD && ahead.length < wanted; k++) {
    const start = shift(prediction.next_start, k * cycle);
    const end = shift(start, usual - 1);
    if (end < today) continue;
    const step = Math.min(STEPS.indexOf(prediction.confidence) + ahead.length, STEPS.length - 1);
    ahead.push({ start, end, window: { from: shift(start, -(half + ahead.length)), to: shift(start, half + ahead.length) }, confidence: STEPS[step]! });
  }
  return ahead;
}

// Likely ovulation 12 to 14 days before the estimated period (luteal phase mean 12.4 days, Bull et
// al., npj Digital Medicine, 2019) and the fertile window of the five days before it through
// ovulation (Wilcox, Weinberg and Baird, NEJM, 1995). Withheld during a pregnancy, after birth, or
// when her measured cycles vary by more than 7 days; low confidence from a stated length or under
// three cycles.
const LUTEAL = { min: 12, max: 14 };
const FERTILE_LEAD = 5;
const STEADY_SPREAD = 7;

export function fertileWindows(input: CalendarInput, count = 3): FertileWindow[] {
  const { periods, cycleSettings, status, today } = input;
  if (status === 'pregnant' || status === 'postpartum') return [];
  const lengths = withoutForgottenPeriods(cycleLengths(periods).reverse()).slice(0, 6);
  if (lengths.length >= 2 && Math.max(...lengths) - Math.min(...lengths) > STEADY_SPREAD) return [];
  const prediction = predictNext(periods, cycleSettings, today, 'neither');
  if (!prediction) return [];
  const confidence = prediction.basis === 'stated' || lengths.length < 3 ? 'low' : prediction.confidence;
  const last = periods.map((p) => p.start).sort().at(-1)!;
  const cycle = between(last, prediction.next_start);
  return Array.from({ length: count }, (_, k) => {
    const next = shift(prediction.next_start, k * cycle);
    const ovulation = { from: shift(next, -LUTEAL.max), to: shift(next, -LUTEAL.min) };
    return { from: shift(ovulation.from, -FERTILE_LEAD), to: ovulation.to, ovulation, confidence };
  });
}

function periodEnd(p: PeriodRecord, usual: number, today: string): string {
  return p.end ?? [shift(p.start, usual - 1), today].sort()[0]!;
}

export function markMonth(input: CalendarInput, month: string): DayMark[] {
  const { periods, cycleSettings, today, dayLogs, entries } = input;
  const usual = usualLength(periods, cycleSettings);
  const estimates = estimatedPeriods(input);
  const fertile = fertileWindows(input);
  const starts = [...periods.map((p) => p.start), ...estimates.map((e) => e.start)].sort();
  const logged = new Set(dayLogs.map((d) => d.date));
  for (const e of entries) logged.add(dayOf(e.created_at));
  const first = `${month}-01`;
  return Array.from({ length: getDaysInMonth(parseISO(first)) }, (_, i) => {
    const date = shift(first, i);
    const own = periods.find((p) => p.start <= date && date <= periodEnd(p, usual, today));
    const est = own ? undefined : estimates.find((e) => e.start <= date && date <= e.end);
    const start = starts.filter((s) => s <= date).at(-1);
    const window = own || est ? undefined : fertile.find((f) => f.from <= date && date <= f.to);
    const ovulating = window !== undefined && window.ovulation.from <= date && date <= window.ovulation.to;
    return {
      date,
      isToday: date === today,
      future: date > today,
      period: own ? ('logged' as const) : est ? ('estimated' as const) : null,
      fertile: window ? (ovulating ? ('ovulation' as const) : ('window' as const)) : null,
      periodDay: own ? between(own.start, date) + 1 : est ? between(est.start, date) + 1 : null,
      cycleDay: start ? between(start, date) + 1 : null,
      hasLog: logged.has(date),
    };
  });
}

export function describeDay(input: CalendarInput, date: string): DayDetail {
  const mark = markMonth(input, date.slice(0, 7)).find((d) => d.date === date)!;
  return {
    mark,
    estimate: estimatedPeriods(input).find((e) => e.start <= date && date <= e.end) ?? null,
    log: input.dayLogs.find((d) => d.date === date) ?? null,
    checkIns: input.entries.filter((e) => dayOf(e.created_at) === date).length,
  };
}

export function loggedDays(periods: PeriodRecord[], usual: number, today: string): string[] {
  const days = new Set<string>();
  for (const p of periods) {
    const end = periodEnd(p, usual, today);
    for (let d = p.start; d <= end; d = shift(d, 1)) days.add(d);
  }
  return [...days].sort();
}

// A tap on a period's first day removes it; on another marked day, that day (and days ahead left
// on their own). An unmarked day beside a period extends it; otherwise it marks her usual days,
// or just that day if they would run into another period. A period never starts ahead of today.
export function toggleDay(days: string[], date: string, usual: number, today: string): string[] {
  const set = new Set(days);
  if (set.has(date)) {
    if (!set.has(shift(date, -1))) {
      for (let d = date; set.has(d); d = shift(d, 1)) set.delete(d);
    } else {
      set.delete(date);
      const rest: string[] = [];
      for (let d = shift(date, 1); set.has(d); d = shift(d, 1)) rest.push(d);
      if (rest.length > 0 && rest.every((d) => d > today)) rest.forEach((d) => set.delete(d));
    }
  } else if (set.has(shift(date, -1)) || set.has(shift(date, 1))) {
    set.add(date);
  } else if (date <= today) {
    const run = Array.from({ length: usual }, (_, i) => shift(date, i));
    const clear = [...run, shift(date, usual)].every((d) => !set.has(d));
    (clear ? run : [date]).forEach((d) => set.add(d));
  }
  return [...set].sort();
}

export function periodsFromDays(days: string[], existing: PeriodRecord[]): PeriodRecord[] {
  const sorted = [...new Set(days)].sort();
  const runs: { start: string; end: string }[] = [];
  for (const d of sorted) {
    const last = runs.at(-1);
    if (last && shift(last.end, 1) === d) last.end = d;
    else runs.push({ start: d, end: d });
  }
  return runs.map(({ start, end }) => {
    const old = existing.find((p) => p.start === start);
    const flows = Object.fromEntries(Object.entries(old?.flow_by_day ?? {}).filter(([d]) => d >= start && d <= end));
    return { id: old?.id ?? `cal-${start}`, start, end, flow_by_day: flows, source: old?.source ?? 'calendar' };
  });
}
