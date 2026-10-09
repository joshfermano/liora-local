import { describe, expect, it } from 'vitest';
import { applyActions, planActions, resolveDate, type AgentAction, type AgentData } from './index';
import type { DayLog, PeriodRecord } from '../types';

const TODAY = '2026-10-10';
const period = (start: string, end: string | null, flow_by_day: PeriodRecord['flow_by_day'] = {}): PeriodRecord => ({ id: `p-${start}`, start, end, flow_by_day, source: 'calendar' });
const data = (over: Partial<AgentData> = {}): AgentData => ({ periods: [], dayLogs: [], cycleSettings: {}, setup: null, ...over });
const today = { kind: 'today' } as const;

describe('resolveDate', () => {
  it('resolves today, yesterday and days ago', () => {
    expect(resolveDate(today, TODAY)).toBe(TODAY);
    expect(resolveDate({ kind: 'yesterday' }, TODAY)).toBe('2026-10-09');
    expect(resolveDate({ kind: 'days_ago', n: 3 }, TODAY)).toBe('2026-10-07');
    expect(resolveDate({ kind: 'days_ago', n: 60 }, TODAY)).toBe('2026-08-11');
  });
  it('rejects days ago outside 1 to 60, future and invalid dates, and unknown', () => {
    expect(resolveDate({ kind: 'days_ago', n: 0 }, TODAY)).toBeNull();
    expect(resolveDate({ kind: 'days_ago', n: 61 }, TODAY)).toBeNull();
    expect(resolveDate({ kind: 'date', date: '2026-10-11' }, TODAY)).toBeNull();
    expect(resolveDate({ kind: 'date', date: '2026-02-30' }, TODAY)).toBeNull();
    expect(resolveDate({ kind: 'date', date: '2026-10-10' }, TODAY)).toBe(TODAY);
    expect(resolveDate({ kind: 'unknown' }, TODAY)).toBeNull();
  });
});

describe('planActions', () => {
  const plan = (a: AgentAction[], d = data(), status: string | undefined = 'neither') => planActions(a, d, status, TODAY);
  const start: AgentAction = { tool: 'period_start', date: today, flow: null };

  it('applies a period start on a free day', () => {
    expect(plan([start]).apply).toEqual([start]);
  });
  it('confirms a start with an unknown date', () => {
    expect(plan([{ ...start, date: { kind: 'unknown' } }]).confirm).toHaveLength(1);
  });
  it('confirms a start that falls inside, or right after, a logged period', () => {
    expect(plan([start], data({ periods: [period('2026-10-08', '2026-10-12')] })).confirm).toEqual([start]);
    expect(plan([start], data({ periods: [period('2026-10-05', '2026-10-09')] })).confirm).toEqual([start]);
  });
  it('applies an end that closes the open period', () => {
    const end: AgentAction = { tool: 'period_end', date: today };
    expect(plan([end], data({ periods: [{ ...period('2026-10-06', null), source: 'tell' }] })).apply).toEqual([end]);
  });
  it('confirms an end with no open period, before the start, or far too late', () => {
    const end: AgentAction = { tool: 'period_end', date: today };
    expect(plan([end]).confirm).toEqual([end]);
    expect(plan([end], data({ periods: [period('2026-10-06', '2026-10-09')] })).confirm).toEqual([end]);
    expect(plan([end], data({ periods: [{ ...period('2026-09-01', null), source: 'tell' }] })).confirm).toEqual([end]);
  });
  it('applies flow, but confirms a different flow already on that day', () => {
    const flow: AgentAction = { tool: 'flow', date: today, flow: 'heavy' };
    expect(plan([flow]).apply).toEqual([flow]);
    const log: DayLog = { date: TODAY, flow: 'light', symptoms: [], moods: [], activities: [] };
    expect(plan([flow], data({ dayLogs: [log] })).confirm).toEqual([flow]);
  });
  it('applies symptoms, moods and activities, and drops empty ones', () => {
    const a: AgentAction[] = [
      { tool: 'symptoms', date: today, symptoms: ['cramps'] },
      { tool: 'moods', date: today, moods: [] },
      { tool: 'activities', date: { kind: 'yesterday' }, activities: ['walk'] },
    ];
    expect(plan(a).apply).toEqual([a[0], a[2]]);
  });
  it('applies weeks when pregnant and confirms it otherwise', () => {
    const w: AgentAction = { tool: 'weeks', weeks: 32 };
    expect(plan([w], data(), 'pregnant').apply).toEqual([w]);
    expect(plan([w], data(), 'neither').confirm).toEqual([w]);
    expect(plan([w], data(), undefined).confirm).toEqual([w]);
  });
  it('applies a delete when a logged period covers the date, and drops it otherwise', () => {
    const del: AgentAction = { tool: 'delete_period', date: { kind: 'yesterday' } };
    expect(plan([del], data({ periods: [period('2026-10-08', '2026-10-12')] })).apply).toEqual([del]);
    expect(plan([del], data({ periods: [period('2026-09-01', '2026-09-05')] }))).toEqual({ apply: [], confirm: [] });
    expect(plan([{ tool: 'delete_period', date: { kind: 'unknown' } }], data({ periods: [period('2026-10-08', null)] }))).toEqual({ apply: [], confirm: [] });
  });
  it('applies a clear only when that day has the parts', () => {
    const log: DayLog = { date: TODAY, flow: null, symptoms: ['cramps'], moods: [], activities: [] };
    const d = data({ dayLogs: [log] });
    const sym: AgentAction = { tool: 'clear_day', date: today, what: 'symptoms' };
    expect(plan([sym], d).apply).toEqual([sym]);
    expect(plan([{ tool: 'clear_day', date: today, what: 'all' }], d).apply).toHaveLength(1);
    expect(plan([{ tool: 'clear_day', date: today, what: 'moods' }], d)).toEqual({ apply: [], confirm: [] });
    expect(plan([sym], data())).toEqual({ apply: [], confirm: [] });
  });
  it('leaves undo, ask_day and open to the store', () => {
    expect(plan([{ tool: 'undo_last' }, { tool: 'ask_day', date: today }, { tool: 'open', screen: 'calendar' }])).toEqual({ apply: [], confirm: [] });
  });
  it('leaves read-only tools out of both lists', () => {
    expect(plan([{ tool: 'cycle_question' }, { tool: 'health_question' }, { tool: 'smalltalk' }])).toEqual({ apply: [], confirm: [] });
  });
});

describe('applyActions: delete and clear', () => {
  const log = (over: Partial<DayLog> = {}): DayLog => ({ date: TODAY, flow: null, symptoms: [], moods: [], activities: [], ...over });
  it('deletes the period covering the date and its flow entries, and Undo holds the old slices', () => {
    const p = period('2026-10-08', '2026-10-12', { '2026-10-08': 'heavy', '2026-10-09': 'light' });
    const other = period('2026-09-01', '2026-09-05');
    const logs = [log({ date: '2026-10-09', flow: 'light', symptoms: ['cramps'] }), log({ date: '2026-10-08', flow: 'heavy' }), log({ date: '2026-09-02', flow: 'medium' })];
    const d = data({ periods: [other, p], dayLogs: logs });
    const out = applyActions([{ tool: 'delete_period', date: { kind: 'yesterday' } }], d, TODAY);
    expect(out.data.periods).toEqual([other]);
    expect(out.data.dayLogs).toHaveLength(2);
    expect(out.data.dayLogs).toContainEqual(log({ date: '2026-10-09', symptoms: ['cramps'] }));
    expect(out.data.dayLogs).toContainEqual(log({ date: '2026-09-02', flow: 'medium' }));
    expect(out.undo).toEqual({ periods: [other, p], dayLogs: logs });
    expect(out.saved).toEqual([{ kind: 'period_deleted', date: p.start, end: p.end }]);
  });
  it('skips a delete when no period covers the date', () => {
    const out = applyActions([{ tool: 'delete_period', date: today }], data({ periods: [period('2026-09-01', '2026-09-05')] }), TODAY);
    expect(out).toEqual({ data: {}, undo: {}, saved: [] });
  });
  it('clears chosen parts of a day and keeps the rest', () => {
    const l = log({ flow: 'light', symptoms: ['cramps'], moods: ['calm'], note: 'hi' });
    const out = applyActions([{ tool: 'clear_day', date: today, what: 'symptoms' }], data({ dayLogs: [l] }), TODAY);
    expect(out.data.dayLogs).toEqual([{ ...l, symptoms: [] }]);
    expect(out.undo).toEqual({ dayLogs: [l] });
    expect(out.saved).toEqual([{ kind: 'day_cleared', date: TODAY, what: 'symptoms' }]);
  });
  it('deletes the log when clearing leaves it empty', () => {
    const out = applyActions([{ tool: 'clear_day', date: today, what: 'moods' }], data({ dayLogs: [log({ moods: ['calm'] })] }), TODAY);
    expect(out.data.dayLogs).toEqual([]);
  });
  it('clears everything for the day, including its period flow entry', () => {
    const p = period('2026-10-08', '2026-10-12', { [TODAY]: 'heavy', '2026-10-09': 'light' });
    const l = log({ flow: 'heavy', moods: ['calm'] });
    const out = applyActions([{ tool: 'clear_day', date: today, what: 'all' }], data({ periods: [p], dayLogs: [l] }), TODAY);
    expect(out.data.dayLogs).toEqual([]);
    expect(out.data.periods).toEqual([{ ...p, flow_by_day: { '2026-10-09': 'light' } }]);
    expect(out.undo).toEqual({ periods: [p], dayLogs: [l] });
  });
  it('skips a clear on a day with nothing logged', () => {
    expect(applyActions([{ tool: 'clear_day', date: today, what: 'all' }], data(), TODAY)).toEqual({ data: {}, undo: {}, saved: [] });
  });
});

describe('applyActions', () => {
  it('starts an open period with its flow and a day log', () => {
    const out = applyActions([{ tool: 'period_start', date: today, flow: 'heavy' }], data(), TODAY);
    expect(out.data.periods).toEqual([{ id: 'tell-2026-10-10', start: TODAY, end: '2026-10-14', flow_by_day: { [TODAY]: 'heavy' }, source: 'tell' }]);
    expect(out.data.dayLogs?.[0]).toMatchObject({ date: TODAY, flow: 'heavy' });
    expect(out.saved).toEqual([{ kind: 'period_start', date: TODAY, end: '2026-10-14' }, { kind: 'flow', date: TODAY, flow: 'heavy' }]);
  });
  it('closes the open period on the end date', () => {
    const open: PeriodRecord = { ...period('2026-10-06', null, { '2026-10-06': 'heavy' }), source: 'tell' };
    const out = applyActions([{ tool: 'period_end', date: today }], data({ periods: [open] }), TODAY);
    expect(out.data.periods).toEqual([{ ...open, end: TODAY }]);
    expect(out.saved).toEqual([{ kind: 'period_end', date: TODAY }]);
  });
  it('skips an end that has no open period to close', () => {
    expect(applyActions([{ tool: 'period_end', date: today }], data(), TODAY)).toEqual({ data: {}, undo: {}, saved: [] });
  });
  it('merges symptoms, moods and activities into an existing day log, never removing', () => {
    const log: DayLog = { date: TODAY, flow: 'light', symptoms: ['cramps'], moods: ['calm'], activities: ['rest'], note: 'hi' };
    const out = applyActions(
      [
        { tool: 'symptoms', date: today, symptoms: ['cramps', 'fatigue'] },
        { tool: 'moods', date: today, moods: ['tired'] },
        { tool: 'activities', date: today, activities: ['walk'] },
      ],
      data({ dayLogs: [log] }),
      TODAY,
    );
    expect(out.data.dayLogs).toEqual([{ ...log, symptoms: ['cramps', 'fatigue'], moods: ['calm', 'tired'], activities: ['rest', 'walk'] }]);
    expect(out.undo).toEqual({ dayLogs: [log] });
    expect(out.data.periods).toBeUndefined();
  });
  it('records a flow in the day log and the period records', () => {
    const out = applyActions([{ tool: 'flow', date: today, flow: 'medium' }], data(), TODAY);
    expect(out.data.dayLogs?.[0]?.flow).toBe('medium');
    expect(out.data.periods?.[0]).toMatchObject({ start: TODAY, flow_by_day: { [TODAY]: 'medium' } });
  });
  it('sets weeks and pregnant status in setup, and Undo holds the old slices exactly', () => {
    const setup = { name: 'A', status: 'neither' };
    const out = applyActions([{ tool: 'weeks', weeks: 32 }], data({ setup }), TODAY);
    expect(out.data.setup).toEqual({ name: 'A', status: 'pregnant', weeks: 32 });
    expect(out.undo).toEqual({ setup });
    expect(out.saved).toEqual([{ kind: 'weeks', weeks: 32 }]);
  });
  it('does not touch its input', () => {
    const d = data({ periods: [period('2026-09-01', '2026-09-05')] });
    const copy = structuredClone(d);
    applyActions([{ tool: 'flow', date: { kind: 'yesterday' }, flow: 'light' }], d, TODAY);
    expect(d).toEqual(copy);
  });
  it('skips actions whose date does not resolve', () => {
    expect(applyActions([{ tool: 'symptoms', date: { kind: 'unknown' }, symptoms: ['cramps'] }], data(), TODAY).saved).toEqual([]);
  });
});
