import { describe, expect, it } from 'vitest';
import { cycleDay, cycleHistory, periodLength, predictNext, resolvePeriodDate } from './index';
import type { PeriodRecord } from '../types';

const rec = (start: string, end: string | null = null): PeriodRecord => ({
  id: start, start, end, flow_by_day: {}, source: 'calendar',
});
const recs = (...starts: string[]) => starts.map((s) => rec(s));
const TODAY = '2026-10-09';

describe('cycleHistory and cycleDay', () => {
  it('lists cycles newest first with their lengths', () => {
    expect(cycleHistory(recs('2026-08-01', '2026-08-29', '2026-09-27'))).toEqual([
      { start: '2026-09-27', length: null },
      { start: '2026-08-29', length: 29 },
      { start: '2026-08-01', length: 28 },
    ]);
  });
  it('counts the cycle day from the latest start', () => {
    expect(cycleDay(recs('2026-10-01'), TODAY)).toBe(9);
    expect(cycleDay([], TODAY)).toBeNull();
    expect(cycleDay(recs('2026-10-12'), TODAY)).toBeNull();
  });
});

describe('predictNext', () => {
  it('worked example 1: lengths 28, 29, 28 give Oct 22, Oct 20 to 24, high', () => {
    const p = predictNext(recs('2026-07-01', '2026-07-29', '2026-08-27', '2026-09-24'), {}, TODAY);
    expect(p).toEqual({
      next_start: '2026-10-22',
      window: { from: '2026-10-20', to: '2026-10-24' },
      basis: 'history',
      cycles_used: 3,
      confidence: 'high',
    });
  });

  it('worked example 2: lengths 26, 35, 30 give 30 days, plus or minus 5, medium', () => {
    const p = predictNext(recs('2026-01-01', '2026-01-27', '2026-03-03', '2026-04-02'), {}, TODAY);
    expect(p).toEqual({
      next_start: '2026-05-02',
      window: { from: '2026-04-27', to: '2026-05-07' },
      basis: 'history',
      cycles_used: 3,
      confidence: 'medium',
    });
  });

  it('two cycles give low confidence', () => {
    const p = predictNext(recs('2026-07-01', '2026-07-29', '2026-08-27'), {}, TODAY);
    expect(p?.confidence).toBe('low');
    expect(p?.cycles_used).toBe(2);
    expect(p?.basis).toBe('history');
  });

  it('never narrows the window below plus or minus 2', () => {
    const p = predictNext(recs('2026-07-01', '2026-07-29', '2026-08-26'), {}, TODAY);
    expect(p?.window).toEqual({ from: '2026-09-21', to: '2026-09-25' });
  });

  it('sorts unordered records', () => {
    const p = predictNext(recs('2026-09-24', '2026-07-01', '2026-08-27', '2026-07-29'), {}, TODAY);
    expect(p?.next_start).toBe('2026-10-22');
  });

  it('drops gaps outside 15 to 90 days as missing logs', () => {
    // 10-day gap and 120-day gap are dropped; 28 and 29 remain
    const p = predictNext(
      recs('2026-01-01', '2026-01-11', '2026-05-11', '2026-06-08', '2026-07-07'),
      {},
      TODAY,
    );
    expect(p?.cycles_used).toBe(2);
    expect(p?.next_start).toBe('2026-08-05');
  });

  it('uses up to the last 12 lengths, the newest weighing most', () => {
    const starts = ['2026-01-01', '2026-01-21'];
    let d = new Date(2026, 0, 21);
    for (let i = 0; i < 6; i++) {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 30);
      starts.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      );
    }
    const p = predictNext(recs(...starts), {}, TODAY);
    expect(p?.cycles_used).toBe(7);
    expect(p?.next_start).toBe('2026-08-19');
  });

  it('leaves out a forgotten period: a cycle twice her steady length', () => {
    // 28, 28, 56, 28, 28: the 56 is two cycles with a start she did not log
    const p = predictNext(recs('2026-01-01', '2026-01-29', '2026-02-26', '2026-04-23', '2026-05-21', '2026-06-18'), {}, TODAY);
    expect(p).toEqual({
      next_start: '2026-07-16',
      window: { from: '2026-07-14', to: '2026-07-18' },
      basis: 'history',
      cycles_used: 4,
      confidence: 'high',
    });
  });

  it('is not pulled off by one odd cycle', () => {
    // 28, 29, 40, 28, 29: an average would say 31; the weighted median says 29
    const p = predictNext(recs('2026-01-01', '2026-01-29', '2026-02-27', '2026-04-08', '2026-05-06', '2026-06-04'), {}, TODAY);
    expect(p?.next_start).toBe('2026-07-03');
  });

  it('follows a recent change in her cycles', () => {
    // 32, 32, 32, then 27, 27, 27: an average would say 30; recent cycles say 27
    const p = predictNext(recs('2026-01-01', '2026-02-02', '2026-03-06', '2026-04-07', '2026-05-04', '2026-05-31', '2026-06-27'), {}, TODAY);
    expect(p?.next_start).toBe('2026-07-24');
  });

  it('falls back to the stated length: plus or minus 3, low', () => {
    const p = predictNext(recs('2026-09-01'), { stated_cycle_length: 30 }, TODAY);
    expect(p).toEqual({
      next_start: '2026-10-01',
      window: { from: '2026-09-28', to: '2026-10-04' },
      basis: 'stated',
      cycles_used: 0,
      confidence: 'low',
    });
  });

  it('prefers history over the stated length', () => {
    const p = predictNext(
      recs('2026-07-01', '2026-07-29', '2026-08-27'),
      { stated_cycle_length: 35 },
      TODAY,
    );
    expect(p?.basis).toBe('history');
  });

  it('returns null with no usable history and nothing stated', () => {
    expect(predictNext([], {}, TODAY)).toBeNull();
    expect(predictNext(recs('2026-09-01'), {}, TODAY)).toBeNull();
    expect(predictNext(recs('2026-07-01', '2026-07-29'), {}, TODAY)).toBeNull();
  });

  it('returns null while pregnant or postpartum', () => {
    const history = recs('2026-07-01', '2026-07-29', '2026-08-27', '2026-09-24');
    expect(predictNext(history, {}, TODAY, 'pregnant')).toBeNull();
    expect(predictNext(history, {}, TODAY, 'postpartum')).toBeNull();
    expect(predictNext(history, { stated_cycle_length: 28 }, TODAY, 'pregnant')).toBeNull();
    expect(predictNext(history, {}, TODAY, 'neither')).not.toBeNull();
  });
});

describe('resolvePeriodDate', () => {
  const base = { event: 'started', days_ago: null, date: null, flow: null } as const;
  it('resolves today, yesterday, days_ago and an explicit date', () => {
    expect(resolvePeriodDate({ ...base, when: 'today' }, TODAY)).toBe('2026-10-09');
    expect(resolvePeriodDate({ ...base, when: 'yesterday' }, TODAY)).toBe('2026-10-08');
    expect(resolvePeriodDate({ ...base, when: 'days_ago', days_ago: 3 }, TODAY)).toBe('2026-10-06');
    expect(resolvePeriodDate({ ...base, when: 'date', date: '2026-09-30' }, TODAY)).toBe('2026-09-30');
  });
  it('crosses a month boundary', () => {
    expect(resolvePeriodDate({ ...base, when: 'days_ago', days_ago: 10 }, TODAY)).toBe('2026-09-29');
  });
  it('returns null for unknown, a missing period, or missing fields', () => {
    expect(resolvePeriodDate({ ...base, when: 'unknown' }, TODAY)).toBeNull();
    expect(resolvePeriodDate(null, TODAY)).toBeNull();
    expect(resolvePeriodDate({ ...base, when: 'days_ago' }, TODAY)).toBeNull();
    expect(resolvePeriodDate({ ...base, when: 'date' }, TODAY)).toBeNull();
  });
});

describe('periodLength', () => {
  it('uses the mean of logged lengths, counting both end days', () => {
    expect(periodLength([rec('2026-07-01', '2026-07-05'), rec('2026-07-29', '2026-08-02')], {})).toBe(5);
    expect(periodLength([rec('2026-07-01', '2026-07-04'), rec('2026-07-29', '2026-08-03')], {})).toBe(5);
  });
  it('falls back to the stated length, then 5', () => {
    expect(periodLength([rec('2026-07-01')], { stated_period_length: 6 })).toBe(6);
    expect(periodLength([], {})).toBe(5);
  });
});
