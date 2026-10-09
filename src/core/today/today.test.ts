import { describe, expect, it } from 'vitest';
import type { DayLog, Entry, PeriodRecord } from '../types';
import { today, type TodayInput } from './index';

const TODAY = '2026-10-10'; // a Saturday

const period = (start: string, end: string | null = null): PeriodRecord => ({ id: start, start, end, flow_by_day: {}, source: 'calendar' });
const day = (date: string, over: Partial<DayLog> = {}): DayLog => ({ date, flow: null, symptoms: [], moods: [], activities: [], ...over });
const entry = (date: string, codes: string[]): Entry =>
  ({
    id: `${date}-${codes.join('-')}`,
    created_at: `${date}T04:00:00.000Z`,
    text: '',
    input: 'text',
    findings: codes.map((code) => ({ code, severity: 'unknown', sources: ['lexicon'], confidence: null })),
    extraction: { period: null, symptoms: [], moods: [], danger_signs: [], pregnancy_weeks: null },
    decision: { level: 'ok', fired: [] },
    card_ids: [],
    models: [],
  }) as Entry;

const input = (over: Partial<TodayInput> = {}): TodayInput => ({
  entries: [],
  moodChecks: [],
  periods: [],
  cycleSettings: {},
  dayLogs: [],
  status: 'neither',
  today: TODAY,
  ...over,
});

// Starts 28, 29, 27 and 29 days apart; the newest leads: next around Oct 24, window Oct 22 to 26; four cycles replay twice, so medium.
const PERIODS = [period('2026-06-04', '2026-06-08'), period('2026-07-02', '2026-07-07'), period('2026-07-31', '2026-08-04'), period('2026-08-27', '2026-08-31'), period('2026-09-25', '2026-09-29')];

describe('the answer at the top of Today', () => {
  it('leads with logging a period when there is nothing yet', () => {
    expect(today(input()).answer).toEqual({ kind: 'first_run' });
  });

  it('counts down to the estimated window', () => {
    expect(today(input({ periods: PERIODS })).answer).toEqual({ kind: 'countdown', from: 12, to: 16, cycleDay: 16, confidence: 'medium', basis: 'history' });
  });

  it('says the period could start any day inside the window', () => {
    expect(today(input({ periods: PERIODS, today: '2026-10-22' })).answer).toMatchObject({ kind: 'any_day', cycleDay: 28 });
  });

  it('names the period day while she is on her period', () => {
    expect(today(input({ periods: [...PERIODS, period('2026-10-08', '2026-10-12')] })).answer).toEqual({ kind: 'period', day: 3 });
  });

  it('gives the cycle day, with no countdown, past the window', () => {
    expect(today(input({ periods: PERIODS, today: '2026-11-02' })).answer).toMatchObject({ kind: 'past_window', cycleDay: 39 });
  });

  it('withholds every cycle estimate while pregnant or after birth', () => {
    expect(today(input({ periods: PERIODS, status: 'pregnant', weeks: 32 })).answer).toEqual({ kind: 'pregnant', weeks: 32 });
    expect(today(input({ periods: PERIODS, status: 'pregnant' })).next).toBeNull();
    expect(today(input({ periods: PERIODS, status: 'pregnant' })).cycles).toBeNull();
    expect(today(input({ periods: PERIODS, status: 'postpartum' })).answer).toEqual({ kind: 'postpartum' });
  });
});

describe('the two-week strip', () => {
  it('runs this week and next from Sunday', () => {
    const strip = today(input()).strip;
    expect(strip).toHaveLength(14);
    expect(strip[0]!.date).toBe('2026-10-04');
    expect(strip[13]!.date).toBe('2026-10-17');
    expect(strip.filter((d) => d.isToday).map((d) => d.date)).toEqual([TODAY]);
  });

  it('marks logged days and the same estimated days as the calendar', () => {
    const strip = today(input({ periods: PERIODS, today: '2026-10-18' })).strip;
    const marked = strip.filter((d) => d.period === 'estimated').map((d) => d.date);
    expect(marked).toEqual(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28']);
  });
});

describe('the next period', () => {
  it('gives the window and how many days until the likely start', () => {
    expect(today(input({ periods: PERIODS })).next).toMatchObject({ next_start: '2026-10-24', window: { from: '2026-10-22', to: '2026-10-26' }, inDays: 14 });
  });

  it('drops the estimate once the window has passed', () => {
    expect(today(input({ periods: PERIODS, today: '2026-11-02' })).next).toBeNull();
  });
});

describe('your cycles', () => {
  it('states lengths from her logs', () => {
    const cycles = today(input({ periods: PERIODS, dayLogs: [day('2026-10-01', { symptoms: ['cramps', 'headache'] })], entries: [entry('2026-09-30', ['bloating'])] })).cycles;
    expect(cycles).toEqual({
      length: { min: 27, max: 29, average: 28, count: 4 },
      period: { average: 5, count: 5 },
      last: 29,
      symptomsThisCycle: 3,
    });
  });

  it('draws her three latest cycles as dots, newest first', () => {
    const rows = today(input({ periods: PERIODS })).rows;
    expect(rows.map((r) => [r.start, r.end, r.length, r.day])).toEqual([
      ['2026-09-25', null, null, 16],
      ['2026-08-27', '2026-09-24', 29, null],
      ['2026-07-31', '2026-08-26', 27, null],
    ]);
    expect(rows[1]!.dots).toHaveLength(29);
    expect(rows[1]!.dots.slice(0, 6)).toEqual(['period', 'period', 'period', 'period', 'period', 'day']);
    const current = rows[0]!.dots;
    expect(current[15]).toBe('day');
    expect(current[16]).toBe('ahead');
    expect(current.at(-1)).toBe('ahead');
    expect(current).toHaveLength(29);
  });

  it('counts the cycles she has logged', () => {
    expect(today(input({ periods: PERIODS })).cyclesLogged).toBe(4);
    expect(today(input({ periods: [period('2026-09-25')] })).cyclesLogged).toBe(0);
  });
});

describe('what she logged today', () => {
  it('marks the quick actions she has already done', () => {
    const logged = today(input({ periods: [period('2026-10-09')], dayLogs: [day(TODAY, { moods: ['tired'] })] })).loggedToday;
    expect(logged).toEqual({ period: true, symptoms: false, mood: true, any: true });
  });
});

describe('the gap question', () => {
  it('asks once a cycle runs about twice her usual length', () => {
    const model = today(input({ periods: [period('2026-06-25')], cycleSettings: { stated_cycle_length: 28 } }));
    expect(model.answer).toMatchObject({ kind: 'past_window', cycleDay: 108 });
    expect(model.gapQuestion).toEqual({ since: '2026-06-25', days: 108 });
    expect(model.rows[0]!.dots.length).toBeLessThanOrEqual(45);
  });

  it('stays quiet in an ordinary cycle', () => {
    expect(today(input({ periods: PERIODS })).gapQuestion).toBeNull();
  });
});

describe('the fertile window on Today', () => {
  const STEADY = ['2026-05-01', '2026-05-29', '2026-06-26', '2026-07-24', '2026-08-21', '2026-09-18'].map((s) => period(s));

  it('shows the current or next estimated window, never one that has passed', () => {
    expect(today(input({ periods: STEADY })).fertile).toMatchObject({ from: '2026-10-25', to: '2026-11-01', ovulation: { from: '2026-10-30', to: '2026-11-01' } });
    expect(today(input({ periods: STEADY, today: '2026-09-30' })).fertile).toMatchObject({ from: '2026-09-27' });
  });

  it('shows none while pregnant or when there is no steady history', () => {
    expect(today(input({ periods: STEADY, status: 'pregnant' })).fertile).toBeNull();
    expect(today(input()).fertile).toBeNull();
  });
});
