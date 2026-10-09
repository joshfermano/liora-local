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

import type { AgentAction } from '../core/agent';

const TODAY = '2026-10-10';
const START: AgentAction = { tool: 'period_start', date: { kind: 'today' }, flow: null };
const SYMPTOM: AgentAction = { tool: 'symptoms', date: { kind: 'today' }, symptoms: ['pelvic_pain'] };
const REMEMBER: AgentAction = { tool: 'remember', note: 'I prefer Taglish' };

// A fresh set of stores over the same disk is what the app sees after a reload.
async function reload() {
  vi.resetModules();
  const [agent, log, journal, memory] = await Promise.all([import('./agent'), import('./log'), import('./journal'), import('./memory')]);
  await Promise.all([log.useLogStore.persist.rehydrate(), journal.useJournalStore.persist.rehydrate(), memory.useMemoryStore.persist.rehydrate()]);
  return { agent, log: log.useLogStore, journal: journal.useJournalStore, memory: memory.useMemoryStore };
}

beforeEach(() => disk.clear());

describe('undo journal', () => {
  it('records each commit with its id, time, saved lines and undo', async () => {
    const { agent, journal } = await reload();
    const done = agent.commit([START], TODAY)!;
    const [entry] = journal.getState().entries;
    expect(entry).toMatchObject({ id: done.undoId, saved: done.saved, undo: { periods: [] } });
    expect(Number.isNaN(Date.parse(entry!.at))).toBe(false);
  });

  it('survives a reload: the commit is still in the journal', async () => {
    const first = await reload();
    const done = first.agent.commit([START], TODAY)!;
    const second = await reload();
    expect(second.journal.getState().entries.map((e) => e.id)).toEqual([done.undoId]);
  });

  it('undo after a reload puts the slices back', async () => {
    const first = await reload();
    first.log.setState({ periods: [], dayLogs: [] });
    first.agent.commit([START, SYMPTOM], TODAY);
    expect(first.log.getState().periods).toHaveLength(1);
    expect(first.log.getState().dayLogs).toHaveLength(1);

    const second = await reload();
    expect(second.log.getState().periods).toHaveLength(1);
    const back = second.agent.revertLatest();
    expect(back?.saved.length).toBeGreaterThan(0);
    expect(second.log.getState().periods).toEqual([]);
    expect(second.log.getState().dayLogs).toEqual([]);
    expect(second.journal.getState().entries).toEqual([]);
    expect(second.agent.revertLatest()).toBeNull();
  });

  it('a Logged block Undo works after a reload while its id is in the journal', async () => {
    const first = await reload();
    first.log.setState({ periods: [] });
    const done = first.agent.commit([START], TODAY)!;
    const second = await reload();
    expect(second.agent.revert(done.undoId)).toBe(true);
    expect(second.log.getState().periods).toEqual([]);
    expect(second.agent.revert(done.undoId)).toBe(false);
  });

  it('undoes an older change only when it does not clobber a newer one', async () => {
    const { agent, log } = await reload();
    log.setState({ periods: [], dayLogs: [] });
    const a = agent.commit([START], TODAY)!;
    const b = agent.commit([SYMPTOM], TODAY)!;
    expect(agent.revert(a.undoId)).toBe(true);
    expect(log.getState().periods).toEqual([]);
    expect(log.getState().dayLogs).toHaveLength(1);
    expect(agent.revert(b.undoId)).toBe(true);
    expect(log.getState().dayLogs).toEqual([]);
  });

  it('refuses an older undo when a newer change touched the same slice', async () => {
    const { agent, log } = await reload();
    log.setState({ periods: [], dayLogs: [] });
    const a = agent.commit([SYMPTOM], TODAY)!;
    agent.commit([{ tool: 'moods', date: { kind: 'today' }, moods: ['tired'] }], TODAY);
    expect(agent.revert(a.undoId)).toBe(false);
    expect(log.getState().dayLogs).toHaveLength(1);
  });

  it('keeps only the last 10 commits', async () => {
    const { agent, journal, log } = await reload();
    log.setState({ dayLogs: [] });
    for (let i = 0; i < 12; i++) agent.commit([{ tool: 'weeks', weeks: 10 + i }], TODAY);
    expect(journal.getState().entries).toHaveLength(10);
  });

  it('undoes a remembered note too', async () => {
    const first = await reload();
    first.agent.commit([REMEMBER], TODAY);
    expect(first.memory.getState().notes).toEqual(['I prefer Taglish']);
    const second = await reload();
    expect(second.memory.getState().notes).toEqual(['I prefer Taglish']);
    expect(second.agent.revertLatest()).not.toBeNull();
    expect(second.memory.getState().notes).toEqual([]);
  });

  it('Delete everything clears the journal and the memory', async () => {
    const { agent, journal, memory, log } = await reload();
    agent.commit([START, REMEMBER], TODAY);
    memory.getState().setLanguage('taglish');
    expect(journal.getState().entries).toHaveLength(1);
    await log.getState().deleteEverything();
    expect(journal.getState().entries).toEqual([]);
    expect(memory.getState().notes).toEqual([]);
    expect(memory.getState().language).toBeUndefined();
    expect(disk.size).toBe(0);
    const after = await reload();
    expect(after.journal.getState().entries).toEqual([]);
    expect(after.memory.getState().notes).toEqual([]);
  });
});
