import { describe, expect, it } from 'vitest';
import type { Entry, MoodResult, PeriodRecord } from '../types';
import { glance, insights, type InsightInput } from './index';

const TODAY = '2026-10-10';

const entry = (day: string, codes: string[], level: Entry['decision']['level'] = 'ok', moods: string[] = []): Entry =>
  ({
    id: `${day}-${codes.join('-')}-${level}`,
    created_at: `${day}T04:00:00.000Z`,
    text: '',
    input: 'text',
    findings: codes.map((code) => ({ code, severity: 'unknown', sources: ['lexicon'], confidence: null })),
    extraction: { period: null, symptoms: [], moods, danger_signs: [], pregnancy_weeks: null },
    decision: { level, fired: [] },
    card_ids: [],
    models: [],
  }) as Entry;

const period = (start: string, end: string | null = null): PeriodRecord => ({ id: start, start, end, flow_by_day: {}, source: 'calendar' });
const check = (day: string): MoodResult => ({ id: day, created_at: `${day}T04:00:00.000Z`, answers: [], total: 0, self_harm_flag: false });

const input = (over: Partial<InsightInput> = {}): InsightInput => ({
  entries: [],
  moodChecks: [],
  periods: [],
  cycleSettings: {},
  status: 'neither',
  today: TODAY,
  ...over,
});

const PERIODS = [period('2026-06-04', '2026-06-08'), period('2026-07-02', '2026-07-07'), period('2026-07-31', '2026-08-04'), period('2026-08-27', '2026-08-31'), period('2026-09-25', '2026-09-29')];

describe('the week strip', () => {
  it('shows three days back, today and three ahead', () => {
    const { strip } = glance(input());
    expect(strip.map((d) => d.date)).toEqual(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']);
    expect(strip.filter((d) => d.isToday).map((d) => d.date)).toEqual([TODAY]);
  });

  it('marks logged period days and her check-ins', () => {
    const { strip } = glance(input({ periods: [period('2026-10-08', '2026-10-09')], entries: [entry('2026-10-09', ['headache']), entry('2026-10-09', [])] }));
    expect(strip.map((d) => d.period)).toEqual([null, 'logged', 'logged', null, null, null, null]);
    expect(strip.find((d) => d.date === '2026-10-09')?.checkIns).toBe(2);
  });

  it('draws a period with no end date for her usual length only, not up to today', () => {
    const { strip } = glance(input({ periods: [period('2026-10-05')] }));
    expect(strip.map((d) => d.period)).toEqual(['logged', 'logged', 'logged', null, null, null, null]);
  });

  it('marks the estimated window when it falls in the strip, but never while pregnant', () => {
    const periods = [period('2026-07-17'), period('2026-08-14'), period('2026-09-11')];
    expect(glance(input({ periods })).strip.some((d) => d.period === 'estimated')).toBe(true);
    expect(glance(input({ periods, status: 'pregnant' })).strip.some((d) => d.period === 'estimated')).toBe(false);
  });
});

describe('this week at a glance', () => {
  it('counts check-ins of the last seven days by what the rules decided', () => {
    const entries = [entry('2026-10-10', ['severe_headache'], 'go_now'), entry('2026-10-08', ['headache'], 'follow_up'), entry('2026-10-04', []), entry('2026-10-03', [])];
    expect(glance(input({ entries })).checkIns).toEqual({ total: 3, go_now: 1, follow_up: 1, ok: 1 });
  });

  it('ranks the moods she mentioned this week', () => {
    const entries = [entry('2026-10-10', [], 'ok', ['tired']), entry('2026-10-09', [], 'ok', ['tired', 'sad']), entry('2026-09-01', [], 'ok', ['sad'])];
    expect(glance(input({ entries })).moods).toEqual([{ mood: 'tired', count: 2 }, { mood: 'sad', count: 1 }]);
  });

  it('gives cycle numbers from her logs, and none while pregnant', () => {
    expect(glance(input({ periods: PERIODS })).cycle).toEqual({ day: 16, averageLength: 28, lastLength: 29, periodLength: 5 });
    expect(glance(input({ periods: PERIODS, status: 'pregnant' })).cycle).toBeNull();
    expect(glance(input()).cycle).toEqual({ day: null, averageLength: null, lastLength: null, periodLength: null });
  });
});

describe('Liora noticed', () => {
  it('states her cycle lengths, spread and period length', () => {
    const found = insights(input({ periods: PERIODS }));
    expect(found).toContainEqual({ kind: 'cycle_length', days: 28, cycles: 4 });
    expect(found).toContainEqual({ kind: 'cycle_spread', min: 27, max: 29 });
    expect(found).toContainEqual({ kind: 'period_length', days: 5, periods: 5 });
  });

  it('says nothing about cycles while pregnant', () => {
    expect(insights(input({ periods: PERIODS, status: 'pregnant' })).filter((i) => i.kind.startsWith('cycle') || i.kind === 'period_length')).toEqual([]);
  });

  it('notices a sign she mentioned more than once in two weeks, danger signs first', () => {
    const entries = [
      entry('2026-10-09', ['headache']),
      entry('2026-10-05', ['headache']),
      entry('2026-10-01', ['headache']),
      entry('2026-10-08', ['vaginal_bleeding'], 'go_now'),
      entry('2026-10-02', ['vaginal_bleeding'], 'go_now'),
      entry('2026-09-01', ['nausea']),
      entry('2026-10-09', ['nausea']),
    ];
    const recurring = insights(input({ entries })).filter((i) => i.kind === 'recurring');
    expect(recurring).toEqual([
      { kind: 'recurring', code: 'vaginal_bleeding', danger: true, count: 2, withinDays: 14 },
      { kind: 'recurring', code: 'headache', danger: false, count: 3, withinDays: 14 },
    ]);
  });

  it('notices a mood she felt more than once this week', () => {
    const entries = [entry('2026-10-10', [], 'ok', ['anxious']), entry('2026-10-07', [], 'ok', ['anxious'])];
    expect(insights(input({ entries }))).toContainEqual({ kind: 'mood_pattern', mood: 'anxious', count: 2, withinDays: 7 });
  });

  it('reminds her of the mood check after two weeks, or when she has never done one', () => {
    const entries = [entry('2026-10-10', []), entry('2026-10-09', []), entry('2026-10-08', [])];
    expect(insights(input({ entries }))).toContainEqual({ kind: 'mood_check', daysSince: null });
    expect(insights(input({ entries, moodChecks: [check('2026-09-20')] }))).toContainEqual({ kind: 'mood_check', daysSince: 20 });
    expect(insights(input({ entries, moodChecks: [check('2026-10-01')] })).some((i) => i.kind === 'mood_check')).toBe(false);
  });

  it('stays quiet with nothing logged', () => {
    expect(insights(input())).toEqual([]);
  });
});

describe('patterns from every way she logs', () => {
  const dayLog = (date: string, symptoms: string[], moods: string[] = []) => ({ date, flow: null, symptoms, moods, activities: [] }) as never;

  it('counts symptoms and moods from the day log, once per day', () => {
    const dayLogs = [dayLog('2026-10-09', ['cramps'], ['tired']), dayLog('2026-10-08', ['cramps'], ['tired']), dayLog('2026-10-07', ['cramps'])];
    const entries = [entry('2026-10-09', ['cramps'])];
    const found = insights({ ...input({ entries }), dayLogs });
    expect(found).toContainEqual({ kind: 'recurring', code: 'cramps', danger: false, count: 3, withinDays: 14 });
    expect(found).toContainEqual({ kind: 'mood_pattern', mood: 'tired', count: 2, withinDays: 7 });
  });
});
