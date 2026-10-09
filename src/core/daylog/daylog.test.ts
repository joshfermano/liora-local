import { describe, expect, it } from 'vitest';
import type { DayLog, PeriodRecord } from '../types';
import { applyFlow, isEmptyDayLog, upsertDayLog } from './index';

const period = (start: string, end: string | null, days: Record<string, 'light' | 'medium' | 'heavy'> = {}): PeriodRecord => ({
  id: `cal-${start}`,
  start,
  end,
  flow_by_day: days,
  source: 'calendar',
});
const log = (date: string, over: Partial<DayLog> = {}): DayLog => ({
  date,
  flow: null,
  symptoms: [],
  moods: [],
  activities: [],
  ...over,
});

describe('applyFlow', () => {
  it('starts a new period on a day with none', () => {
    const out = applyFlow([], '2026-10-05', 'medium');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ start: '2026-10-05', end: null, flow_by_day: { '2026-10-05': 'medium' } });
  });
  it('sets the flow inside an existing period', () => {
    const out = applyFlow([period('2026-10-01', '2026-10-05')], '2026-10-03', 'heavy');
    expect(out).toHaveLength(1);
    expect(out[0].flow_by_day['2026-10-03']).toBe('heavy');
    expect(out[0].end).toBe('2026-10-05');
  });
  it('extends an ended period by the next day', () => {
    const out = applyFlow([period('2026-10-01', '2026-10-03')], '2026-10-04', 'light');
    expect(out).toHaveLength(1);
    expect(out[0].end).toBe('2026-10-04');
  });
  it('keeps an open period open when extending', () => {
    const out = applyFlow([period('2026-10-01', null, { '2026-10-01': 'light' })], '2026-10-02', 'light');
    expect(out[0].end).toBeNull();
    expect(out[0].flow_by_day['2026-10-02']).toBe('light');
  });
  it('moves the start earlier when logged the day before a period', () => {
    const out = applyFlow([period('2026-10-02', null)], '2026-10-01', 'light');
    expect(out).toHaveLength(1);
    expect(out[0].start).toBe('2026-10-01');
  });
  it('starts a separate period when far from any other', () => {
    expect(applyFlow([period('2026-09-01', '2026-09-05')], '2026-10-01', 'light')).toHaveLength(2);
  });
  it('clears the flow of a day without deleting the period', () => {
    const out = applyFlow([period('2026-10-01', '2026-10-03', { '2026-10-02': 'light' })], '2026-10-02', null);
    expect(out[0].flow_by_day['2026-10-02']).toBeUndefined();
  });
  it('does nothing when clearing a day with no period', () => {
    const before = [period('2026-09-01', '2026-09-05')];
    expect(applyFlow(before, '2026-10-01', null)).toEqual(before);
  });
  it('does not mutate its input', () => {
    const before = [period('2026-10-01', '2026-10-03')];
    const copy = JSON.parse(JSON.stringify(before));
    applyFlow(before, '2026-10-04', 'light');
    expect(before).toEqual(copy);
  });
});

describe('upsertDayLog', () => {
  it('adds and replaces by date', () => {
    const a = upsertDayLog([], log('2026-10-01', { moods: ['calm'] }));
    const b = upsertDayLog(a, log('2026-10-01', { moods: ['sad'] }));
    expect(b).toHaveLength(1);
    expect(b[0].moods).toEqual(['sad']);
  });
  it('drops a log that has nothing in it', () => {
    const a = upsertDayLog([], log('2026-10-01', { moods: ['calm'] }));
    expect(upsertDayLog(a, log('2026-10-01'))).toEqual([]);
  });
  it('treats a blank note as empty', () => {
    expect(isEmptyDayLog(log('2026-10-01', { note: '  ' }))).toBe(true);
    expect(isEmptyDayLog(log('2026-10-01', { note: 'x' }))).toBe(false);
  });
});
