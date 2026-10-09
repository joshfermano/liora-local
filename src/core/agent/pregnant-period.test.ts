import { describe, expect, it } from 'vitest';
import { applyActions, planActions, readActions } from './index';
import type { AgentData } from './types';

const TODAY = '2026-10-10';
const pregnant: AgentData = { periods: [], dayLogs: [], cycleSettings: {}, setup: { name: 'Gweny', status: 'pregnant', weeks: 1 } };

describe('a period logged while her profile says pregnant', () => {
  it('saves nothing until she confirms she is not pregnant', () => {
    const plan = planActions(readActions('Log my period today', TODAY), pregnant, 'pregnant', TODAY);
    expect(plan.apply).toEqual([]);
    expect(plan.confirm).toEqual([{ tool: 'set_status', status: 'neither' }, { tool: 'period_start', date: { kind: 'today' }, flow: null }]);
  });

  it('on her yes, updates her profile and logs the period', () => {
    const plan = planActions(readActions('Log my period today', TODAY), pregnant, 'pregnant', TODAY);
    const out = applyActions(plan.confirm, pregnant, TODAY);
    expect(out.data.setup).toEqual({ name: 'Gweny', status: 'neither' });
    expect(out.data.periods).toHaveLength(1);
    expect(out.saved[0]).toEqual({ kind: 'status', status: 'neither' });
    expect(out.undo.setup).toEqual(pregnant.setup);
  });

  it('logs at once when she is not pregnant', () => {
    const neither = { ...pregnant, setup: { status: 'neither' } };
    expect(planActions(readActions('Log my period today', TODAY), neither, 'neither', TODAY).apply).toHaveLength(1);
  });
});
