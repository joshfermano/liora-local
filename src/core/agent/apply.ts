import { usualLength } from '../calendar';
import { applyFlow, upsertDayLog } from '../daylog';
import { resolveDate } from './dates';
import { dayHas, mergeLog, openPeriodFor, periodsToDelete, shift, startFits } from './fit';
import type { AgentAction, AgentData, Applied, SavedItem } from './types';

type Step = { data: Partial<AgentData>; saved: SavedItem[] } | null;

function step(a: AgentAction, cur: AgentData, today: string): Step {
  if (a.tool === 'weeks') {
    return { data: { setup: { ...(cur.setup ?? {}), status: 'pregnant', weeks: a.weeks } }, saved: [{ kind: 'weeks', weeks: a.weeks }] };
  }
  if (a.tool === 'cycle_question' || a.tool === 'health_question' || a.tool === 'smalltalk') return null;
  if (a.tool === 'undo_last' || a.tool === 'ask_day' || a.tool === 'open') return null;
  const date = resolveDate(a.date, today);
  if (!date) return null;
  switch (a.tool) {
    case 'delete_period': {
      const gone = periodsToDelete(date, a.span, cur, today);
      if (gone.length === 0) return null;
      const flowDays = gone.flatMap((p) => Object.keys(p.flow_by_day));
      const dayLogs = flowDays.reduce((logs, d) => {
        const log = logs.find((l) => l.date === d);
        return log ? upsertDayLog(logs, { ...log, flow: null }) : logs;
      }, cur.dayLogs);
      return {
        data: { periods: cur.periods.filter((p) => !gone.includes(p)), dayLogs },
        saved: [...gone].sort((x, y) => x.start.localeCompare(y.start)).map((p) => ({ kind: 'period_deleted' as const, date: p.start, end: p.end })),
      };
    }
    case 'clear_day': {
      if (!dayHas(date, a.what, cur)) return null;
      const log = cur.dayLogs.find((l) => l.date === date);
      const part = a.what;
      const next = log && { ...log, ...(part === 'all' ? { flow: null, symptoms: [], moods: [], activities: [], note: undefined } : part === 'flow' ? { flow: null } : { [part]: [] }) };
      const periods = part === 'all' || part === 'flow' ? applyFlow(cur.periods, date, null) : cur.periods;
      const data: Partial<AgentData> = { dayLogs: next ? upsertDayLog(cur.dayLogs, next) : cur.dayLogs };
      if (periods !== cur.periods) data.periods = periods;
      return { data, saved: [{ kind: 'day_cleared', date, what: part }] };
    }
    case 'period_start': {
      if (!startFits(date, cur, today)) return null;
      // Her usual days are marked at once, as in the calendar's edit mode; "tapos na" shortens them.
      const end = shift(date, usualLength(cur.periods, cur.cycleSettings) - 1);
      const record = { id: `tell-${date}`, start: date, end, flow_by_day: a.flow ? { [date]: a.flow } : {}, source: 'tell' as const };
      const saved: SavedItem[] = [{ kind: 'period_start', date, end }];
      if (!a.flow) return { data: { periods: [...cur.periods, record] }, saved };
      saved.push({ kind: 'flow', date, flow: a.flow });
      return { data: { periods: [...cur.periods, record], dayLogs: mergeLog(cur.dayLogs, date, { flow: a.flow }) }, saved };
    }
    case 'period_end': {
      const open = openPeriodFor(date, cur.periods);
      if (!open) return null;
      return { data: { periods: cur.periods.map((p) => (p === open ? { ...p, end: date } : p)) }, saved: [{ kind: 'period_end', date }] };
    }
    case 'flow':
      return {
        data: { periods: applyFlow(cur.periods, date, a.flow), dayLogs: mergeLog(cur.dayLogs, date, { flow: a.flow }) },
        saved: [{ kind: 'flow', date, flow: a.flow }],
      };
    case 'symptoms':
      return a.symptoms.length ? { data: { dayLogs: mergeLog(cur.dayLogs, date, { symptoms: a.symptoms }) }, saved: [{ kind: 'symptoms', date, values: a.symptoms }] } : null;
    case 'moods':
      return a.moods.length ? { data: { dayLogs: mergeLog(cur.dayLogs, date, { moods: a.moods }) }, saved: [{ kind: 'moods', date, values: a.moods }] } : null;
    case 'activities':
      return a.activities.length
        ? { data: { dayLogs: mergeLog(cur.dayLogs, date, { activities: a.activities }) }, saved: [{ kind: 'activities', date, values: a.activities }] }
        : null;
  }
}

// Pure: new slices, the old slices for Undo, and the lines for the "Saved" block. An action that
// no longer fits is skipped, so applying never replaces what she already logged.
export function applyActions(actions: AgentAction[], data: AgentData, today: string): Applied {
  let cur = data;
  const undo: Applied['undo'] = {};
  const saved: SavedItem[] = [];
  for (const a of actions) {
    const s = step(a, cur, today);
    if (!s) continue;
    for (const key of ['periods', 'dayLogs', 'setup'] as const) {
      if (key in s.data && !(key in undo)) (undo as Record<string, unknown>)[key] = data[key];
    }
    cur = { ...cur, ...s.data };
    saved.push(...s.saved);
  }
  const changed = Object.fromEntries(Object.keys(undo).map((k) => [k, cur[k as keyof AgentData]]));
  return { data: changed, undo, saved };
}
