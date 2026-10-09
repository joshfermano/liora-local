import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entry, MoodResult, PeriodRecord } from '../core/types';

const disk = new Map<string, string>();
vi.mock('./storage', () => ({
  storage: {
    getItem: async (k: string) => disk.get(k) ?? null,
    setItem: async (k: string, v: string) => void disk.set(k, v),
    removeItem: async (k: string) => void disk.delete(k),
    clear: async () => disk.clear(),
  },
}));

import { useLogStore } from './log';

const entry = (id: string): Entry => ({
  id,
  created_at: '2026-10-09T14:00:00.000Z',
  text: 'x',
  input: 'text',
  findings: [],
  extraction: null,
  decision: { level: 'ok', fired: [] },
  card_ids: [],
  models: [],
});
const mood: MoodResult = { id: 'm1', created_at: '2026-10-09T14:00:00.000Z', answers: [0], total: 0, self_harm_flag: false };
const period: PeriodRecord = { id: 'p1', start: '2026-09-01', end: null, flow_by_day: {}, source: 'tell' };

beforeEach(async () => {
  await useLogStore.getState().deleteEverything();
});

describe('log store', () => {
  it('keeps entries newest first', () => {
    useLogStore.getState().addEntry(entry('a'));
    useLogStore.getState().addEntry(entry('b'));
    expect(useLogStore.getState().entries.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('replaces an entry with the same id instead of duplicating it', () => {
    useLogStore.getState().addEntry(entry('a'));
    useLogStore.getState().addEntry({ ...entry('a'), text: 'changed' });
    expect(useLogStore.getState().entries).toHaveLength(1);
    expect(useLogStore.getState().entries[0]?.text).toBe('changed');
  });

  it('deletes one entry', () => {
    useLogStore.getState().addEntry(entry('a'));
    useLogStore.getState().addEntry(entry('b'));
    useLogStore.getState().deleteEntry('a');
    expect(useLogStore.getState().entries.map((e) => e.id)).toEqual(['b']);
  });

  it('deleteEverything wipes entries, setup, moods, periods and the stored bytes', async () => {
    const s = useLogStore.getState();
    s.addEntry(entry('a'));
    s.setSetup({ status: 'pregnant' });
    s.addMood(mood);
    s.setPeriods([period]);
    await s.deleteEverything();
    const after = useLogStore.getState();
    expect(after.entries).toEqual([]);
    expect(after.setup).toBeNull();
    expect(after.moods).toEqual([]);
    expect(after.periods).toEqual([]);
    expect(disk.size).toBe(0);
  });

  it('persists to storage', async () => {
    useLogStore.getState().addEntry(entry('a'));
    await Promise.resolve();
    expect(disk.get('tell-liora-log')).toContain('"id":"a"');
  });
});
