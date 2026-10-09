import { describe, expect, it } from 'vitest';
import type { PeriodRecord } from '../types';
import { applyActions, guardReply, planActions, readActions } from './index';
import type { AgentData } from './types';

const TODAY = '2026-10-10';
const period = (start: string, end: string): PeriodRecord => ({ id: start, start, end, flow_by_day: {}, source: 'calendar' });
const data = (periods: PeriodRecord[]): AgentData => ({ periods, dayLogs: [], cycleSettings: {}, setup: null });
const OCT = [period('2026-09-12', '2026-09-16'), period('2026-10-01', '2026-10-03'), period('2026-10-10', '2026-10-14')];

describe('deleting periods she asks to remove', () => {
  it('reads plural periods and a span as deleting periods, never clearing a day', () => {
    expect(readActions('Remove my periods logged this month', TODAY)).toEqual([{ tool: 'delete_period', date: { kind: 'today' }, span: 'month' }]);
    expect(readActions('alisin mo lahat ng regla ko', TODAY)).toEqual([{ tool: 'delete_period', date: { kind: 'today' }, span: 'all' }]);
    expect(readActions('Remove the logged period from today', TODAY)).toEqual([{ tool: 'delete_period', date: { kind: 'today' } }]);
  });

  it('removes every period that started this month and keeps the rest', () => {
    const actions = readActions('Remove my periods logged this month', TODAY);
    const plan = planActions(actions, data(OCT), 'neither', TODAY);
    expect(plan.apply).toEqual(actions);
    const out = applyActions(plan.apply, data(OCT), TODAY);
    expect(out.data.periods).toEqual([OCT[0]!]);
    expect(out.saved).toEqual([
      { kind: 'period_deleted', date: '2026-10-01', end: '2026-10-03' },
      { kind: 'period_deleted', date: '2026-10-10', end: '2026-10-14' },
    ]);
    expect(out.undo.periods).toEqual(OCT);
  });

  it('removes all periods when she asks for all', () => {
    const out = applyActions([{ tool: 'delete_period', date: { kind: 'today' }, span: 'all' }], data(OCT), TODAY);
    expect(out.data.periods).toEqual([]);
    expect(out.saved).toHaveLength(3);
  });

  it('does nothing when there is no period in that span', () => {
    const plan = planActions([{ tool: 'delete_period', date: { kind: 'today' }, span: 'month' }], data([OCT[0]!]), 'neither', TODAY);
    expect(plan).toEqual({ apply: [], confirm: [] });
  });
});

describe('the reply guard blocks reassurance', () => {
  it.each(["Okay lang 'yan!", "It's okay.", 'Nothing to worry about.', 'Walang dapat ipag-alala.', "Don't worry."])('drops "%s"', (line) => {
    expect(guardReply(line, {})).toBeNull();
  });
});
