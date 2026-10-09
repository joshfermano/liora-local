import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { loggedDays, usualLength } from '../calendar';
import { isEmptyDayLog, upsertDayLog } from '../daylog';
import type { DayLog, Flow, PeriodRecord } from '../types';
import type { AgentData } from './types';

const shift = (date: string, n: number) => format(addDays(parseISO(date), n), 'yyyy-MM-dd');

// A period reported as ended more than this long after it began is more likely a late report than
// a real length. A plausibility guard on logging, not a medical limit.
const MAX_OPEN_DAYS = 14;

export function startFits(date: string, data: AgentData, today: string): boolean {
  const days = new Set(loggedDays(data.periods, usualLength(data.periods, data.cycleSettings), today));
  return ![date, shift(date, -1), shift(date, 1)].some((d) => days.has(d));
}

export function openPeriodFor(date: string, periods: PeriodRecord[]): PeriodRecord | null {
  const open = periods.filter((p) => p.end === null && p.start <= date).sort((a, b) => (a.start < b.start ? -1 : 1));
  const last = open.at(-1);
  return last && differenceInCalendarDays(parseISO(date), parseISO(last.start)) <= MAX_OPEN_DAYS ? last : null;
}

export function flowClashes(date: string, flow: Flow, data: AgentData): boolean {
  const logged = data.dayLogs.find((l) => l.date === date)?.flow ?? null;
  const inPeriod = data.periods.find((p) => date in p.flow_by_day)?.flow_by_day[date] ?? null;
  return [logged, inPeriod].some((f) => f !== null && f !== flow);
}

// The logged period that covers a day; one still open covers her usual length, never past today.
export function periodCovering(date: string, data: AgentData, today: string): PeriodRecord | null {
  const usual = usualLength(data.periods, data.cycleSettings);
  const end = (p: PeriodRecord) => p.end ?? [shift(p.start, usual - 1), today].sort()[0]!;
  return data.periods.find((p) => p.start <= date && date <= end(p)) ?? null;
}

// The periods a delete reaches: the one covering the date, every period that started in its
// month, or all of them.
export function periodsToDelete(date: string, span: 'month' | 'all' | undefined, data: AgentData, today: string): PeriodRecord[] {
  if (span === 'all') return data.periods;
  if (span === 'month') return data.periods.filter((p) => p.start.slice(0, 7) === date.slice(0, 7));
  const one = periodCovering(date, data, today);
  return one ? [one] : [];
}

export type Part = 'all' | 'flow' | 'symptoms' | 'moods' | 'activities';

export function dayHas(date: string, what: Part, data: AgentData): boolean {
  const log = data.dayLogs.find((l) => l.date === date);
  const flow = (log !== undefined && log.flow !== null) || data.periods.some((p) => date in p.flow_by_day);
  if (what === 'flow') return flow;
  if (what === 'all') return flow || (log !== undefined && !isEmptyDayLog(log));
  return (log?.[what].length ?? 0) > 0;
}

const union =<T>(a: T[], b: T[]): T[] => [...new Set([...a, ...b])];

export function mergeLog(logs: DayLog[], date: string, patch: Partial<Pick<DayLog, 'flow' | 'symptoms' | 'moods' | 'activities'>>): DayLog[] {
  const old: DayLog = logs.find((l) => l.date === date) ?? { date, flow: null, symptoms: [], moods: [], activities: [] };
  return upsertDayLog(logs, {
    ...old,
    flow: patch.flow ?? old.flow,
    symptoms: union(old.symptoms, patch.symptoms ?? []),
    moods: union(old.moods, patch.moods ?? []),
    activities: union(old.activities, patch.activities ?? []),
  });
}
