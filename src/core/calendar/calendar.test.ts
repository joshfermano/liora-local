import { describe, expect, it } from 'vitest';
import type { DayLog, Entry, PeriodRecord } from '../types';
import { describeDay, estimatedPeriods, fertileWindows, loggedDays, markMonth, periodsFromDays, toggleDay, usualLength, type CalendarInput } from './index';

const TODAY = '2026-10-10';
const period = (start: string, end: string | null = null): PeriodRecord => ({ id: start, start, end, flow_by_day: {}, source: 'calendar' });
const PERIODS = [period('2026-04-07', '2026-04-11'), period('2026-05-06', '2026-05-10'), period('2026-06-04', '2026-06-08'), period('2026-07-02', '2026-07-07'), period('2026-07-31', '2026-08-04'), period('2026-08-27', '2026-08-31'), period('2026-09-25', '2026-09-29')];
const log = (date: string): DayLog => ({ date, flow: null, symptoms: ['cramps'], moods: [], activities: [] });
const checkIn = (date: string) => ({ id: date, created_at: `${date}T04:00:00.000Z` }) as Entry;

const input = (over: Partial<CalendarInput> = {}): CalendarInput => ({
  periods: PERIODS,
  cycleSettings: {},
  status: 'neither',
  today: TODAY,
  dayLogs: [],
  entries: [],
  ...over,
});

describe('her usual period length', () => {
  it('comes from the periods she logged, else what she said, else five days', () => {
    expect(usualLength(PERIODS, {})).toBe(5);
    expect(usualLength([], { stated_period_length: 4 })).toBe(4);
    expect(usualLength([], {})).toBe(5);
  });
});

describe('estimates ahead', () => {
  it('draws three cycles ahead when her cycles are steady, each window wider and less sure', () => {
    expect(estimatedPeriods(input())).toEqual([
      { start: '2026-10-24', end: '2026-10-28', window: { from: '2026-10-22', to: '2026-10-26' }, confidence: 'high' },
      { start: '2026-11-22', end: '2026-11-26', window: { from: '2026-11-19', to: '2026-11-25' }, confidence: 'medium' },
      { start: '2026-12-21', end: '2026-12-25', window: { from: '2026-12-17', to: '2026-12-25' }, confidence: 'low' },
    ]);
  });

  it('draws nothing during a pregnancy or after birth', () => {
    expect(estimatedPeriods(input({ status: 'pregnant' }))).toEqual([]);
    expect(estimatedPeriods(input({ status: 'postpartum' }))).toEqual([]);
  });

  it('skips estimates that have already passed', () => {
    const ahead = estimatedPeriods(input({ periods: [period('2026-06-25')], cycleSettings: { stated_cycle_length: 28 } }), 1);
    expect(ahead).toHaveLength(1);
    expect(ahead[0]!.end >= TODAY).toBe(true);
  });
});

describe('a month of marks', () => {
  it('marks logged and estimated period days with their day numbers', () => {
    const sept = markMonth(input(), '2026-09');
    expect(sept).toHaveLength(30);
    expect(sept[24]).toMatchObject({ date: '2026-09-25', period: 'logged', periodDay: 1, cycleDay: 1 });
    expect(sept[28]).toMatchObject({ date: '2026-09-29', period: 'logged', periodDay: 5 });
    expect(sept[29]).toMatchObject({ date: '2026-09-30', period: null, periodDay: null, cycleDay: 6 });

    const oct = markMonth(input({ dayLogs: [log('2026-10-03')], entries: [checkIn('2026-10-05')] }), '2026-10');
    expect(oct[9]).toMatchObject({ date: TODAY, isToday: true, future: false, cycleDay: 16 });
    expect(oct[23]).toMatchObject({ date: '2026-10-24', period: 'estimated', periodDay: 1, future: true, cycleDay: 1 });
    expect(oct[27]).toMatchObject({ date: '2026-10-28', period: 'estimated', periodDay: 5 });
    expect(oct.filter((d) => d.hasLog).map((d) => d.date)).toEqual(['2026-10-03', '2026-10-05']);
  });

  it('describes a day in words for its sheet', () => {
    const detail = describeDay(input({ dayLogs: [log('2026-10-25')] }), '2026-10-25');
    expect(detail.mark).toMatchObject({ period: 'estimated', periodDay: 2 });
    expect(detail.estimate).toMatchObject({ start: '2026-10-24', confidence: 'high' });
    expect(detail.log?.symptoms).toEqual(['cramps']);
    expect(detail.checkIns).toBe(0);
  });
});

describe('edit mode', () => {
  const usual = 5;

  it('lists the days she logged, an open period for her usual length up to today', () => {
    expect(loggedDays([period('2026-09-25', '2026-09-27'), period('2026-10-08')], usual, TODAY)).toEqual([
      '2026-09-25', '2026-09-26', '2026-09-27', '2026-10-08', '2026-10-09', '2026-10-10',
    ]);
  });

  it('marks her usual days from a first tap', () => {
    expect(toggleDay([], '2026-10-01', usual, TODAY)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
  });

  it('extends a period by one day from a tap beside it', () => {
    expect(toggleDay(['2026-10-01', '2026-10-02'], '2026-10-03', usual, TODAY)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('marks one day when her usual days would run into another period', () => {
    expect(toggleDay(['2026-10-05'], '2026-10-02', usual, TODAY)).toEqual(['2026-10-02', '2026-10-05']);
  });

  it('removes the whole period from its first day, and one day from any other', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03'];
    expect(toggleDay(days, '2026-10-01', usual, TODAY)).toEqual([]);
    expect(toggleDay(days, '2026-10-03', usual, TODAY)).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('never starts a period on a day still to come', () => {
    expect(toggleDay([], '2026-10-20', usual, TODAY)).toEqual([]);
    expect(toggleDay(['2026-10-10'], '2026-10-11', usual, TODAY)).toEqual(['2026-10-10', '2026-10-11']);
  });

  it('writes runs of days back as periods, keeping what it can of the old ones', () => {
    const old = { ...period('2026-09-25', '2026-09-29'), flow_by_day: { '2026-09-26': 'heavy' as const, '2026-09-29': 'light' as const } };
    const back = periodsFromDays(['2026-09-25', '2026-09-26', '2026-09-27', '2026-10-08', '2026-10-09'], [old]);
    expect(back).toEqual([
      { id: '2026-09-25', start: '2026-09-25', end: '2026-09-27', flow_by_day: { '2026-09-26': 'heavy' }, source: 'calendar' },
      { id: 'cal-2026-10-08', start: '2026-10-08', end: '2026-10-09', flow_by_day: {}, source: 'calendar' },
    ]);
  });
});

describe('the fertile window, an estimate and never contraception', () => {
  // Starts every 28 days: next period Oct 16, then Nov 13 and Dec 11.
  const STEADY = ['2026-05-01', '2026-05-29', '2026-06-26', '2026-07-24', '2026-08-21', '2026-09-18'].map((s) => period(s));
  const steady = (over: Partial<CalendarInput> = {}) => input({ periods: STEADY, ...over });

  it('places likely ovulation 12 to 14 days before each estimated period, and the five days before it', () => {
    const windows = fertileWindows(steady());
    expect(windows.slice(0, 2)).toEqual([
      { from: '2026-09-27', to: '2026-10-04', ovulation: { from: '2026-10-02', to: '2026-10-04' } },
      { from: '2026-10-25', to: '2026-11-01', ovulation: { from: '2026-10-30', to: '2026-11-01' } },
    ]);
    expect(windows).toHaveLength(3);
  });

  it('is withheld during a pregnancy, after birth, with fewer than three cycles, or when her cycles vary widely', () => {
    expect(fertileWindows(steady({ status: 'pregnant' }))).toEqual([]);
    expect(fertileWindows(steady({ status: 'postpartum' }))).toEqual([]);
    expect(fertileWindows(input({ periods: STEADY.slice(-3) }))).toEqual([]);
    const varying = ['2026-03-01', '2026-03-25', '2026-04-30', '2026-05-26', '2026-07-01', '2026-07-27'].map((s) => period(s));
    expect(fertileWindows(input({ periods: varying }))).toEqual([]);
    expect(fertileWindows(input({ periods: [period('2026-09-18')], cycleSettings: { stated_cycle_length: 28 } }))).toEqual([]);
  });

  it('marks the window and likely ovulation on the calendar, never over a period day', () => {
    const oct = markMonth(steady(), '2026-10');
    expect(oct[1]).toMatchObject({ date: '2026-10-02', fertile: 'ovulation' });
    expect(oct[24]).toMatchObject({ date: '2026-10-25', fertile: 'window' });
    expect(oct[15]).toMatchObject({ date: '2026-10-16', period: 'estimated', fertile: null });
    expect(markMonth(steady({ status: 'pregnant' }), '2026-10').every((d) => d.fertile === null)).toBe(true);
  });
});
