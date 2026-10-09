import { addDays, format, parseISO } from 'date-fns';
import type { DayLog, Flow, PeriodRecord } from '../types';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const shift = (date: string, n: number) => ymd(addDays(parseISO(date), n));

export function isEmptyDayLog(l: DayLog): boolean {
  return (
    l.flow === null &&
    l.symptoms.length === 0 &&
    l.moods.length === 0 &&
    l.activities.length === 0 &&
    !l.note?.trim()
  );
}

export function upsertDayLog(logs: DayLog[], next: DayLog): DayLog[] {
  const rest = logs.filter((l) => l.date !== next.date);
  return isEmptyDayLog(next) ? rest : [...rest, next];
}

function lastDay(p: PeriodRecord): string {
  if (p.end) return p.end;
  return Object.keys(p.flow_by_day).reduce((a, b) => (b > a ? b : a), p.start);
}

// Records a flow for one day through the period records the calendar and predictions read.
export function applyFlow(periods: PeriodRecord[], date: string, flow: Flow | null): PeriodRecord[] {
  const inside = periods.find((p) => p.start <= date && date <= lastDay(p));
  if (flow === null) {
    if (!inside || !(date in inside.flow_by_day)) return periods;
    const { [date]: _gone, ...flow_by_day } = inside.flow_by_day;
    return periods.map((p) => (p === inside ? { ...p, flow_by_day } : p));
  }
  const withFlow = (p: PeriodRecord, over: Partial<PeriodRecord> = {}): PeriodRecord => ({
    ...p,
    ...over,
    flow_by_day: { ...p.flow_by_day, [date]: flow },
  });
  if (inside) return periods.map((p) => (p === inside ? withFlow(p) : p));

  const before = periods.find((p) => shift(lastDay(p), 1) === date);
  if (before) return periods.map((p) => (p === before ? withFlow(p, p.end ? { end: date } : {}) : p));

  const after = periods.find((p) => p.start === shift(date, 1));
  if (after) return periods.map((p) => (p === after ? withFlow(p, { id: `cal-${date}`, start: date }) : p));

  return [
    ...periods,
    { id: `cal-${date}`, start: date, end: null, flow_by_day: { [date]: flow }, source: 'calendar' },
  ];
}
