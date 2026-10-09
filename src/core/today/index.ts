import type { Insight, InsightInput } from '../insights';
import type { DayLog, Prediction } from '../types';

// Everything the Today tab shows, worked out from her logs on the phone. Counts and dates only.
export interface TodayInput extends InsightInput {
  dayLogs: DayLog[];
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
  patterns: Insight[];
  cyclesLogged: number;
}

export function today(_input: TodayInput): TodayModel {
  return {
    answer: { kind: 'first_run' },
    strip: [],
    next: null,
    cycles: null,
    rows: [],
    loggedToday: { period: false, symptoms: false, mood: false, any: false },
    gapQuestion: null,
    patterns: [],
    cyclesLogged: 0,
  };
}
