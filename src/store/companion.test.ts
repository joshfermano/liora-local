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

import { useCompanionStore } from './companion';
import { useLogStore } from './log';

describe('companion thread', () => {
  beforeEach(() => {
    useCompanionStore.getState().clear();
    useLogStore.setState({ entries: [], setup: null, moods: [], periods: [], cycleSettings: {} });
  });

  it('adds her message and a reply', async () => {
    await useCompanionStore.getState().send('hello');
    const m = useCompanionStore.getState().messages;
    expect(m.map((x) => x.role)).toEqual(['her', 'liora']);
    expect(m[1]!.blocks?.length).toBeGreaterThan(0);
    expect(useCompanionStore.getState().thinking).toBe(false);
  });

  it('ignores empty text', async () => {
    await useCompanionStore.getState().send('   ');
    expect(useCompanionStore.getState().messages).toEqual([]);
  });

  it('empties when everything is deleted', async () => {
    useLogStore.setState({ setup: { name: 'A' } });
    useCompanionStore.setState({ messages: [{ id: '1', role: 'her', text: 'x', at: '' }] });
    await useLogStore.getState().deleteEverything();
    expect(useCompanionStore.getState().messages).toEqual([]);
  });
});
