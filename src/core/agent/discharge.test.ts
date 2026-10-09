import { describe, expect, it } from 'vitest';
import { applyActions, planActions, readActions, type AgentAction, type AgentData } from './index';
import { triage } from './triage';

const TODAY = '2026-10-10';
const read = (text: string) => readActions(text, TODAY).find((a) => a.tool === 'discharge') as Extract<AgentAction, { tool: 'discharge' }> | undefined;
const empty: AgentData = { periods: [], dayLogs: [], cycleSettings: {}, setup: null };

describe('reading discharge in her words', () => {
  it.each([
    ['may discharge ako', {}],
    ['May puting discharge ako ngayon', { color: 'white' }],
    ['I have white discharge today', { color: 'white' }],
    ['may lumalabas na malapot sa ari ko', { texture: 'sticky' }],
    ['dilaw na discharge, mabaho', { color: 'yellow', smell: 'unusual' }],
    ['clear and stretchy discharge, parang sipon', { color: 'clear', texture: 'egg_white' }],
    ['marami akong discharge na parang gatas', { texture: 'creamy', amount: 'heavy' }],
    ['konting brown discharge', { color: 'brown', amount: 'light' }],
    ['green discharge na buo-buo', { color: 'green', texture: 'clumpy' }],
    ['watery discharge, walang amoy', { texture: 'watery', smell: 'none' }],
  ])('reads "%s"', (text, discharge) => {
    expect(read(text)?.discharge).toEqual(discharge);
    expect(read(text)?.date).toEqual({ kind: 'today' });
  });

  it.each(['wala akong discharge', 'normal ba ang discharge?', 'masakit ulo ko', 'parang tubig ang ihi ko'])('does not log "%s"', (text) => {
    expect(read(text)).toBeUndefined();
  });

  it('reads yesterday', () => {
    expect(read('may puting discharge ako kahapon')?.date).toEqual({ kind: 'yesterday' });
  });
});

describe('saving discharge from the chat', () => {
  it('saves a dated discharge at once', () => {
    const actions = readActions('May puting discharge ako ngayon', TODAY);
    expect(planActions(actions, empty, 'pregnant', TODAY).apply.map((a) => a.tool)).toContain('discharge');
  });

  it('merges into the day, keeping what she logged unless she says otherwise', () => {
    const data: AgentData = { ...empty, dayLogs: [{ date: TODAY, flow: null, symptoms: [], moods: [], activities: [], discharge: { color: 'white', amount: 'light' } }] };
    const applied = applyActions([{ tool: 'discharge', date: { kind: 'today' }, discharge: { texture: 'creamy', amount: 'medium' } }], data, TODAY);
    expect(applied.data.dayLogs?.[0]?.discharge).toEqual({ color: 'white', texture: 'creamy', amount: 'medium' });
    expect(applied.saved).toEqual([{ kind: 'discharge', date: TODAY, discharge: { texture: 'creamy', amount: 'medium' } }]);
    expect(applied.undo.dayLogs).toEqual(data.dayLogs);
  });

  it('keeps the full danger check for a discharge message', () => {
    expect(triage('watery discharge', TODAY, 'pregnant').typed).toBe('all');
  });
});
