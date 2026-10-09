import type { Context, CycleSettings, Entry, Mood, MoodResult, PeriodRecord } from '../types';

// Today's glance and "Liora noticed": counts and lengths from her own logs, never advice.
export interface InsightInput {
  entries: Entry[];
  moodChecks: MoodResult[];
  periods: PeriodRecord[];
  cycleSettings: CycleSettings;
  status: Context['status'] | undefined;
  today: string;
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

export function glance(_input: InsightInput): Glance {
  return { strip: [], checkIns: { total: 0, go_now: 0, follow_up: 0, ok: 0 }, moods: [], cycle: null };
}

export function insights(_input: InsightInput): Insight[] {
  return [];
}
