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

import { setAskIntent, useCompanionStore } from './companion';
import { useLogStore } from './log';
import { useTellStore } from './tell';

describe('companion thread', () => {
  beforeEach(() => {
    useCompanionStore.getState().clear();
    useLogStore.setState({ entries: [], setup: null, moods: [], periods: [], cycleSettings: {} });
    setAskIntent(null);
  });

  it('asks Gemma only when the word rules cannot tell what she means', async () => {
    const ask = vi.fn(async () => 'greeting' as const);
    setAskIntent(ask);
    await useCompanionStore.getState().send('basta ganun');
    await useCompanionStore.getState().send('hello');
    expect(ask).toHaveBeenCalledTimes(1);
    const first = useCompanionStore.getState().messages[1]!;
    expect(first.blocks?.find((b) => b.kind === 'text')).toMatchObject({ kind: 'text', key: 'companion.greeting.anon' });
  });

  it('keeps the rules reading when Gemma fails', async () => {
    setAskIntent(async () => {
      throw new Error('no model');
    });
    await useCompanionStore.getState().send('basta ganun');
    expect(useCompanionStore.getState().messages[1]!.blocks?.find((b) => b.kind === 'text')).toMatchObject({ key: 'companion.other' });
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

  it('answers with the error line and unlocks when the reply never finishes', async () => {
    vi.useFakeTimers();
    const submit = useTellStore.getState().submit;
    useTellStore.setState({ submit: () => new Promise(() => {}) });
    try {
      const sent = useCompanionStore.getState().send('hello');
      await vi.advanceTimersByTimeAsync(30_000);
      await sent;
      const m = useCompanionStore.getState().messages;
      expect(m.map((x) => x.role)).toEqual(['her', 'liora']);
      expect(m[1]!.blocks?.[0]).toMatchObject({ kind: 'text', key: 'liora.error' });
      expect(useCompanionStore.getState().thinking).toBe(false);
    } finally {
      useTellStore.setState({ submit });
      vi.useRealTimers();
    }
  });
});

