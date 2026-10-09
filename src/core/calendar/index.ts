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

export interface DayMark {
  date: string;
  isToday: boolean;
  future: boolean;
  period: 'logged' | 'estimated' | null;
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

export function usualLength(_periods: PeriodRecord[], _settings: CycleSettings): number {
  return 5;
}

export function estimatedPeriods(_input: CalendarInput, _count = 3): EstimatedPeriod[] {
  return [];
}

// Every day of the month `month` (YYYY-MM), in order.
export function markMonth(_input: CalendarInput, _month: string): DayMark[] {
  return [];
}

export function describeDay(_input: CalendarInput, date: string): DayDetail {
  return {
    mark: { date, isToday: false, future: false, period: null, periodDay: null, cycleDay: null, hasLog: false },
    estimate: null,
    log: null,
    checkIns: 0,
  };
}

// Edit mode works on a plain list of marked days and writes periods back only on Save.
export function loggedDays(_periods: PeriodRecord[], _usual: number, _today: string): string[] {
  return [];
}

export function toggleDay(days: string[], _date: string, _usual: number, _today: string): string[] {
  return days;
}

export function periodsFromDays(_days: string[], _existing: PeriodRecord[]): PeriodRecord[] {
  return [];
}
