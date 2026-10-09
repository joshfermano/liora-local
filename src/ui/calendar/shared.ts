import { addMonths, format, startOfMonth } from 'date-fns';
import { useMemo } from 'react';
import type { CalendarInput } from '../../core/calendar';
import { useLogStore } from '../../store/log';
import { useProfile } from '../../store/profile';

export const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
export const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

export const MONTHS_BACK = 12;

// From a year back to the end of next year, so any month in the year view can open.
export function monthRange(now: Date): string[] {
  const first = startOfMonth(addMonths(now, -MONTHS_BACK));
  const last = new Date(now.getFullYear() + 1, 11, 1);
  const out: string[] = [];
  for (let m = first; m <= last; m = addMonths(m, 1)) out.push(format(m, 'yyyy-MM'));
  return out;
}

export function useCalendarInput(): CalendarInput {
  const periods = useLogStore((s) => s.periods);
  const cycleSettings = useLogStore((s) => s.cycleSettings);
  const dayLogs = useLogStore((s) => s.dayLogs);
  const entries = useLogStore((s) => s.entries);
  const { status } = useProfile();
  const today = ymd(new Date());
  return useMemo(
    () => ({ periods, cycleSettings, status, today, dayLogs, entries }),
    [periods, cycleSettings, status, today, dayLogs, entries],
  );
}
