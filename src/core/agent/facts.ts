import { format, parseISO } from 'date-fns';
import { fertileWindows, type CalendarInput } from '../calendar';
import { cycleDay, predictNext } from '../cycle';
import type { AgentData, Facts } from './types';
import { periodCovering } from './fit';

export { guardReply } from './reply';

const words = (date: string) => format(parseISO(date), 'MMM d');
const range = (from: string, to: string) => `${words(from)} to ${words(to)}`;

// What her cycle or pregnancy looks like today, as plain facts for the responder: cycle day, next
// period window, fertile window, period ongoing, weeks pregnant. Dates are written out in words.
export function cycleFacts(data: AgentData, status: string | undefined, today: string): Facts {
  if (status === 'pregnant') return { status: 'pregnant', weeks: typeof data.setup?.weeks === 'number' ? data.setup.weeks : null };
  if (status === 'postpartum') return { status: 'postpartum' };
  const input: CalendarInput = {
    periods: data.periods,
    cycleSettings: data.cycleSettings,
    status: 'neither',
    today,
    dayLogs: data.dayLogs,
    entries: [],
  };
  // Like the Today tab: no window once it has passed.
  const next = predictNext(data.periods, data.cycleSettings, today, 'neither');
  const coming = next && today <= next.window.to ? next : null;
  const fertile = fertileWindows(input).find((f) => f.to >= today);
  return {
    cycle_day: cycleDay(data.periods, today),
    period_today: periodCovering(today, data, today) !== null,
    next_period: coming ? range(coming.window.from, coming.window.to) : null,
    next_period_confidence: coming?.confidence ?? null,
    fertile_window: fertile ? range(fertile.from, fertile.to) : null,
    cycles_logged: data.periods.length,
  };
}

// What she logged on one day.
export function dayFacts(data: AgentData, date: string): Facts {
  const log = data.dayLogs.find((l) => l.date === date);
  const note = log?.note?.trim() || null;
  const flow = log?.flow ?? null;
  const symptoms = log?.symptoms ?? [];
  const moods = log?.moods ?? [];
  const activities = log?.activities ?? [];
  return {
    date: words(date),
    flow,
    symptoms,
    moods,
    activities,
    note,
    anything_logged: flow !== null || symptoms.length + moods.length + activities.length > 0 || note !== null,
  };
}
