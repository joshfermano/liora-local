import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Context, CycleSettings, Extraction, PeriodRecord, Prediction } from '../types';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const MIN_CYCLE = 15;
const MAX_CYCLE = 90;
const MAX_RECENT = 12;
const SPREAD_CYCLES = 6;
const DECAY = 0.85;
const DEFAULT_PERIOD_LENGTH = 5;

export function cycleLengths(periods: PeriodRecord[]): number[] {
  const starts = [...new Set(periods.map((p) => p.start))].sort();
  const lengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const gap = differenceInCalendarDays(parseISO(starts[i]!), parseISO(starts[i - 1]!));
    if (gap >= MIN_CYCLE && gap <= MAX_CYCLE) lengths.push(gap);
  }
  return lengths;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

// Each older cycle weighs 0.85 of the next, so recent cycles lead and one odd cycle cannot.
export function weightedMedian(newestFirst: number[]): number {
  const items = newestFirst.map((v, i) => ({ v, w: DECAY ** i })).sort((a, b) => a.v - b.v);
  const half = items.reduce((sum, it) => sum + it.w, 0) / 2;
  let acc = 0;
  for (const it of items) {
    acc += it.w;
    if (acc >= half) return it.v;
  }
  return items[items.length - 1]!.v;
}

// A cycle near a whole multiple of her usual length, when her other cycles are steady, holds a
// period she did not log (Li, Urteaga et al., JAMIA 2022, on skipped logging in cycle tracking).
export function withoutForgottenPeriods(newestFirst: number[]): number[] {
  if (newestFirst.length < 4) return newestFirst;
  return newestFirst.filter((c, i) => {
    const others = newestFirst.filter((_, j) => j !== i);
    const m = median(others);
    const steady = (1.4826 * median(others.map((x) => Math.abs(x - m)))) / m <= 0.15;
    const ratio = c / m;
    return !(steady && ratio >= 1.6 && Math.abs(ratio - Math.round(ratio)) <= 0.2);
  });
}

export function predictNext(
  periods: PeriodRecord[],
  settings: CycleSettings,
  _today: string,
  status: Context['status'] = 'neither',
): Prediction | null {
  if (status !== 'neither') return null;
  const starts = periods.map((p) => p.start).sort();
  const last = starts[starts.length - 1];
  if (!last) return null;

  const recent = withoutForgottenPeriods(cycleLengths(periods).reverse()).slice(0, MAX_RECENT);
  let L: number;
  let half: number;
  let basis: Prediction['basis'];
  let confidence: Prediction['confidence'];

  if (recent.length >= 2) {
    L = Math.round(weightedMedian(recent));
    const near = recent.slice(0, SPREAD_CYCLES);
    const spread = Math.max(...near) - Math.min(...near);
    half = Math.max(2, Math.ceil(spread / 2));
    basis = 'history';
    confidence = recent.length >= 3 ? (spread <= 7 ? 'high' : 'medium') : 'low';
  } else if (settings.stated_cycle_length) {
    L = settings.stated_cycle_length;
    half = 3;
    basis = 'stated';
    confidence = 'low';
  } else {
    return null;
  }

  const next = addDays(parseISO(last), L);
  return {
    next_start: fmt(next),
    window: { from: fmt(addDays(next, -half)), to: fmt(addDays(next, half)) },
    basis,
    cycles_used: basis === 'history' ? recent.length : 0,
    confidence,
  };
}

export function resolvePeriodDate(period: Extraction['period'], today: string): string | null {
  if (!period) return null;
  switch (period.when) {
    case 'today':
      return today;
    case 'yesterday':
      return fmt(addDays(parseISO(today), -1));
    case 'days_ago':
      return period.days_ago === null ? null : fmt(addDays(parseISO(today), -period.days_ago));
    case 'date':
      return period.date;
    default:
      return null;
  }
}

export interface CycleSpan {
  start: string;
  length: number | null;
}

// Newest first. The latest cycle is still running, so it has no length yet.
export function cycleHistory(periods: PeriodRecord[]): CycleSpan[] {
  const starts = [...new Set(periods.map((p) => p.start))].sort();
  return starts
    .map((start, i) => {
      const next = starts[i + 1];
      return { start, length: next ? differenceInCalendarDays(parseISO(next), parseISO(start)) : null };
    })
    .reverse();
}

export function cycleDay(periods: PeriodRecord[], today: string): number | null {
  const last = periods
    .map((p) => p.start)
    .filter((s) => s <= today)
    .sort()
    .pop();
  return last ? differenceInCalendarDays(parseISO(today), parseISO(last)) + 1 : null;
}

export function periodLength(periods: PeriodRecord[], settings: CycleSettings): number {
  const logged = periods
    .filter((p): p is PeriodRecord & { end: string } => p.end !== null)
    .map((p) => differenceInCalendarDays(parseISO(p.end), parseISO(p.start)) + 1)
    .filter((n) => n > 0);
  if (logged.length > 0) return Math.round(logged.reduce((a, b) => a + b, 0) / logged.length);
  return settings.stated_period_length ?? DEFAULT_PERIOD_LENGTH;
}
