import { beforeEach, describe, expect, it, vi } from 'vitest';

const disk = new Map<string, string>();
vi.mock('./storage', () => ({
  storage: {
    getItem: async (k: string) => disk.get(k) ?? null,
    setItem: async (k: string, v: string) => void disk.set(k, v),
    removeItem: async (k: string) => void disk.delete(k),
    clear: async () => disk.clear(),
  },
}));

const core = vi.hoisted(() => ({
  readActions: vi.fn(),
  mergeActions: vi.fn(),
  planActions: vi.fn(),
  applyActions: vi.fn(),
  toneOf: vi.fn(),
}));
vi.mock('../core/agent', async (importOriginal) => ({ ...(await importOriginal<object>()), ...core }));

import { setRouteActions, setWarmLine } from './agent';
import { useCompanionStore } from './companion';
import { useLogStore } from './log';

const START = { tool: 'period_start', date: { kind: 'today' }, flow: null } as const;
const PERIOD = { id: 'p1', start: '2026-10-10', end: null, flow_by_day: {}, source: 'tell' as const };
const OLD = { ...PERIOD, id: 'p0', start: '2026-09-01' };
const applied = {
  data: { periods: [PERIOD] },
  undo: { periods: [] },
  saved: [{ kind: 'period_start', date: '2026-10-10' }],
};

const last = () => useCompanionStore.getState().messages.at(-1)!;
const kinds = () => (last().blocks ?? []).map((b) => b.kind);

describe('companion agent turn', () => {
  beforeEach(() => {
    useCompanionStore.getState().clear();
    useLogStore.setState({ entries: [], setup: null, moods: [], periods: [], dayLogs: [], cycleSettings: {} });
    setRouteActions(null);
    setWarmLine(null);
    core.readActions.mockReset().mockReturnValue([]);
    core.mergeActions.mockReset().mockImplementation((rules: unknown[], gemma: unknown[]) => [...rules, ...gemma]);
    core.planActions.mockReset().mockImplementation((actions: unknown[]) => ({ apply: actions, confirm: [] }));
    core.applyActions.mockReset().mockReturnValue(applied);
    core.toneOf.mockReset().mockReturnValue('tired');
  });

  it('saves a clear log at once, shows what was saved and waits for the warm line', async () => {
    core.readActions.mockReturnValue([START]);
    setWarmLine(async (_t, _tone, ctx, onToken) => {
      onToken?.('Nandito');
      expect(ctx.saved).toEqual(applied.saved);
      return 'Nandito lang ako.';
    });
    await useCompanionStore.getState().send('Niregla ako today');
    expect(useLogStore.getState().periods).toEqual([PERIOD]);
    expect(kinds().slice(0, 2)).toEqual(['warm', 'logged']);
    expect(kinds()).not.toContain('period_confirm');
    await vi.waitFor(() => expect(last().blocks![0]).toMatchObject({ kind: 'warm', text: 'Nandito lang ako.', tone: 'tired' }));
  });

  it('keeps the warm text empty when no model gives a line', async () => {
    core.readActions.mockReturnValue([START]);
    await useCompanionStore.getState().send('Niregla ako today');
    expect(last().blocks![0]).toMatchObject({ kind: 'warm', text: null });
  });

  it('writes nothing and adds no warm line for a go-now entry', async () => {
    core.readActions.mockReturnValue([START]);
    const warm = vi.fn(async () => 'x');
    setWarmLine(warm);
    await useCompanionStore.getState().send('nanganganak na ako at sobrang dami ng dugo');
    expect(core.applyActions).not.toHaveBeenCalled();
    expect(warm).not.toHaveBeenCalled();
    expect(useLogStore.getState().periods).toEqual([]);
    expect(kinds()).toContain('decision');
    expect(kinds()).not.toContain('warm');
    expect(kinds()).not.toContain('logged');
  });

  it('asks Gemma to route only when the rules read nothing', async () => {
    const route = vi.fn(async () => [{ tool: 'smalltalk' } as const]);
    setRouteActions(route);
    await useCompanionStore.getState().send('asdf qwer');
    expect(route).toHaveBeenCalledTimes(1);
    core.readActions.mockReturnValue([START]);
    await useCompanionStore.getState().send('Niregla ako today');
    expect(route).toHaveBeenCalledTimes(1);
  });

  it('undo puts the old slices back and drops the logged block', async () => {
    core.readActions.mockReturnValue([START]);
    useLogStore.setState({ periods: [OLD] });
    core.applyActions.mockReturnValue({ ...applied, undo: { periods: [OLD] } });
    await useCompanionStore.getState().send('Niregla ako today');
    const logged = last().blocks!.find((b) => b.kind === 'logged');
    if (logged?.kind !== 'logged') throw new Error('no logged block');
    expect(useLogStore.getState().periods).toEqual([PERIOD]);
    expect(useCompanionStore.getState().undo(logged.undoId)).toBe(true);
    expect(useLogStore.getState().periods).toEqual([OLD]);
    expect(kinds()).not.toContain('logged');
    expect(useCompanionStore.getState().undo(logged.undoId)).toBe(false);
  });

  it('confirm applies the waiting actions and adds a logged block; no drops them', async () => {
    core.readActions.mockReturnValue([START]);
    core.planActions.mockImplementation((actions: unknown[]) => ({ apply: [], confirm: actions }));
    await useCompanionStore.getState().send('Niregla ako');
    expect(core.applyActions).not.toHaveBeenCalled();
    const ask = last().blocks!.find((b) => b.kind === 'confirm');
    if (ask?.kind !== 'confirm') throw new Error('no confirm block');
    expect(ask.actions).toEqual([START]);
    useCompanionStore.getState().confirm(ask.confirmId, true);
    expect(useLogStore.getState().periods).toEqual([PERIOD]);
    expect(kinds()).toContain('logged');
    expect(kinds()).not.toContain('confirm');

    core.applyActions.mockClear();
    await useCompanionStore.getState().send('Niregla ako');
    const again = last().blocks!.find((b) => b.kind === 'confirm');
    if (again?.kind !== 'confirm') throw new Error('no confirm block');
    useCompanionStore.getState().confirm(again.confirmId, false);
    expect(core.applyActions).not.toHaveBeenCalled();
    expect(kinds()).not.toContain('confirm');
    expect(kinds()).not.toContain('logged');
  });

  it('saves a voice entry with input voice', async () => {
    await useCompanionStore.getState().send('magandang gabi po', 'voice');
    expect(useLogStore.getState().entries[0]!.input).toBe('voice');
  });
});
