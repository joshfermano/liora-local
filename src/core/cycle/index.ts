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

const MIN_REPLAYS_FOR_WINDOW = 6;
const MIN_REPLAYS_FOR_TRACK = 3;
const STEADY = 0.15;

const robustSpread = (xs: number[]) => {
  const m = median(xs);
  return 1.4826 * median(xs.map((x) => Math.abs(x - m)));
};
const isSteady = (xs: number[]) => robustSpread(xs) / median(xs) <= STEADY;

function percentile(sorted: number[], q: number): number {
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

// One odd miss among steady cycles counts only up to 3 robust SDs (at least a day each) from the rest.
function clampOneOffs(errors: number[]): number[] {
  return errors.map((e, i) => {
    const others = errors.filter((_, j) => j !== i);
    const m = median(others);
    const edge = 3 * Math.max(1, robustSpread(others));
    return Math.min(m + edge, Math.max(m - edge, e));
  });
}

interface Offsets {
  before: number;
  after: number;
}

// Days before and after the next start that her window covers, from the cycles before it
// (newest first) and the errors of the replays so far.
function windowOffsets(recent: number[], errors: number[]): Offsets {
  if (errors.length >= MIN_REPLAYS_FOR_WINDOW) {
    const e = isSteady(recent) ? clampOneOffs(errors) : errors;
    const sorted = [...e].sort((a, b) => a - b);
    return {
      before: Math.max(1, Math.ceil(-percentile(sorted, 0.1))),
      after: Math.max(1, Math.ceil(percentile(sorted, 0.9))),
    };
  }
  const near = recent.slice(0, SPREAD_CYCLES);
  const half = Math.max(2, Math.ceil((Math.max(...near) - Math.min(...near)) / 2));
  return { before: half, after: half };
}

const likelyLength = (newestFirst: number[]) => Math.round(weightedMedian(newestFirst.slice(0, MAX_RECENT)));

// Predicts each past cycle from the ones before it, as predictNext would have at the time.
function replay(newestFirst: number[]): { errors: number[]; held: number } {
  const oldestFirst = [...newestFirst].reverse();
  const errors: number[] = [];
  let held = 0;
  for (let k = 2; k < oldestFirst.length; k++) {
    const before = oldestFirst.slice(0, k).reverse();
    const miss = oldestFirst[k]! - likelyLength(before);
    const { before: lo, after: hi } = windowOffsets(before.slice(0, MAX_RECENT), errors);
    if (miss >= -lo && miss <= hi) held++;
    errors.push(miss);
  }
  return { errors, held };
}

type Confidence = Prediction['confidence'];

function historyConfidence(
  recent: number[],
  track: { checked: number; held: number },
  offsets: Offsets,
): Confidence {
  if (track.checked >= MIN_REPLAYS_FOR_TRACK) {
    const rate = track.held / track.checked;
    const narrow = offsets.before + offsets.after + 1 <= 9;
    if (track.checked >= 4 && rate >= 0.8 && isSteady(recent) && narrow) return 'high';
    return rate >= 0.6 ? 'medium' : 'low';
  }
  const near = recent.slice(0, SPREAD_CYCLES);
  const spread = Math.max(...near) - Math.min(...near);
  return recent.length >= 3 && spread <= 7 ? 'medium' : 'low';
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

  const recent = withoutForgottenPeriods(cycleLengths(periods).reverse());
  let L: number;
  let offsets: Offsets;
  let basis: Prediction['basis'];
  let confidence: Confidence;
  let track: Prediction['track'];

  if (recent.length >= 2) {
    const { errors, held } = replay(recent);
    L = likelyLength(recent);
    offsets = windowOffsets(recent.slice(0, MAX_RECENT), errors);
    basis = 'history';
    if (errors.length >= MIN_REPLAYS_FOR_TRACK) track = { checked: errors.length, held };
    confidence = historyConfidence(recent.slice(0, MAX_RECENT), { checked: errors.length, held }, offsets);
  } else if (settings.stated_cycle_length) {
    L = settings.stated_cycle_length;
    offsets = { before: 3, after: 3 };
    basis = 'stated';
    confidence = 'low';
  } else {
    return null;
  }

  const next = addDays(parseISO(last), L);
  return {
    next_start: fmt(next),
    window: { from: fmt(addDays(next, -offsets.before)), to: fmt(addDays(next, offsets.after)) },
    basis,
    cycles_used: basis === 'history' ? Math.min(recent.length, MAX_RECENT) : 0,
    confidence,
    ...(track ? { track } : {}),
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
