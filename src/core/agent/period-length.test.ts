import { describe, expect, it } from 'vitest';
import type { PeriodRecord } from '../types';
import { applyActions, guardReply, planActions, readActions } from './index';
import type { AgentData } from './types';

const TODAY = '2026-10-10';
const data = (periods: PeriodRecord[] = [], stated?: number): AgentData => ({
  periods,
  dayLogs: [],
  cycleSettings: stated ? { stated_period_length: stated } : {},
  setup: null,
});
const run = (text: string, d: AgentData, today = TODAY) => {
  const plan = planActions(readActions(text, today), d, 'neither', today);
  return applyActions(plan.apply, d, today);
};

describe('logging a period marks her usual days', () => {
  it('marks five days when nothing else is known', () => {
    const out = run('Log my period today', data());
    expect(out.data.periods).toEqual([{ id: 'tell-2026-10-10', start: '2026-10-10', end: '2026-10-14', flow_by_day: {}, source: 'tell' }]);
    expect(out.saved).toEqual([{ kind: 'period_start', date: '2026-10-10', end: '2026-10-14' }]);
  });

  it('uses the period length she gave', () => {
    expect(run('Niregla ako today', data([], 7)).data.periods?.[0]?.end).toBe('2026-10-16');
  });

  it('shortens the period when she says it ended early', () => {
    const p: PeriodRecord = { id: 'tell-2026-10-08', start: '2026-10-08', end: '2026-10-12', flow_by_day: {}, source: 'tell' };
    const out = run('tapos na regla ko today', data([p]));
    expect(out.data.periods).toEqual([{ ...p, end: '2026-10-10' }]);
  });
});

describe('the reply never claims what the tools did not do', () => {
  it('drops a claim to have logged or removed something when nothing changed', () => {
    expect(guardReply('I have logged your whole cycle, Gweny.', {})).toBeNull();
    expect(guardReply("I've removed it for you. Your next period is likely Nov 7.", { her_data: 'Next period: likely Nov 7' })).toBe(
      'Your next period is likely Nov 7.',
    );
  });

  it('keeps the claim when the tools did it', () => {
    expect(guardReply("I've logged your period for today.", { saved: ['period logged from today to Oct 14'] })).toBe(
      "I've logged your period for today.",
    );
  });
});
