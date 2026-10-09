import { describe, expect, it } from 'vitest';
import { planActions } from './plan';
import { readActions } from './read';
import type { AgentData } from './types';

const today = '2026-10-10';
const data = (periods: AgentData['periods'] = []): AgentData => ({ periods, dayLogs: [], cycleSettings: {}, setup: { status: 'neither' } });

describe('how speech spells "niregla"', () => {
  it.each([
    'Hey, Liora. Na regla ako today, medyo malakas, tapos may cramps ako.',
    'naregla ako kanina',
    'nagregla ako today',
    'nire-regla ako ngayon',
  ])('%s starts her period', (t) => {
    expect(readActions(t, today).some((a) => a.tool === 'period_start')).toBe(true);
  });
});

describe('a flow on a day with no period near it is her period starting', () => {
  const flow = (f: 'light' | 'medium' | 'heavy' | 'spotting') => ({ tool: 'flow' as const, date: { kind: 'today' as const }, flow: f });

  it('logs a period start, so the calendar gets her usual length', () => {
    const plan = planActions([flow('heavy')], data(), 'neither', today);
    expect(plan.apply).toEqual([{ tool: 'period_start', date: { kind: 'today' }, flow: 'heavy' }]);
  });

  it('keeps a flow inside a period she already logged', () => {
    const plan = planActions([flow('heavy')], data([{ id: 'p', start: '2026-10-09', end: null, flow_by_day: {}, source: 'calendar' }]), 'neither', today);
    expect(plan.apply.map((a) => a.tool)).toEqual(['flow']);
  });

  it('keeps spotting as spotting', () => {
    const plan = planActions([flow('spotting')], data(), 'neither', today);
    expect(plan.apply.map((a) => a.tool)).toEqual(['flow']);
  });
});
