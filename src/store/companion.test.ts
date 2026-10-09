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

import { format } from 'date-fns';
import { setRouteActions, setSayReply } from './agent';
import { useCompanionStore } from './companion';
import { useLogStore } from './log';
import { useTellStore } from './tell';

const send = (text: string) => useCompanionStore.getState().send(text);
const last = () => useCompanionStore.getState().messages.at(-1)!;
const kinds = () => (last().blocks ?? []).map((b) => b.kind);
const reply = () => last().blocks!.find((b) => b.kind === 'reply');

describe('companion thread with the real rules and no model', () => {
  beforeEach(() => {
    useCompanionStore.getState().clear();
    useLogStore.setState({ entries: [], setup: null, moods: [], periods: [], dayLogs: [], cycleSettings: {} });
    setRouteActions(null);
    setSayReply(null);
  });

  it('answers a greeting once, with no template question', async () => {
    await send('hello');
    expect(kinds().filter((k) => k === 'reply')).toHaveLength(1);
    expect(kinds()).not.toContain('text');
    expect(reply()).toMatchObject({ fallback: { key: 'reply.greeting.anon' } });
  });

  it('thanks her back after "Thank you!"', async () => {
    await send('Thank you!');
    expect(reply()).toMatchObject({ text: null, fallback: { key: 'reply.thanks' } });
    expect(kinds()).toEqual(['reply']);
  });

  it('removes a logged period when she asks, and undoes it', async () => {
    const day = format(new Date(), 'yyyy-MM-dd');
    useLogStore.setState({ periods: [{ id: 'p1', start: day, end: null, flow_by_day: {}, source: 'calendar' }] });
    await send('Remove the logged period from today');
    expect(useLogStore.getState().periods).toEqual([]);
    expect(last().blocks!.find((b) => b.kind === 'logged')).toMatchObject({ items: [{ kind: 'period_deleted', date: day }] });
    expect(reply()).toMatchObject({ fallback: { key: 'reply.deleted' } });
    await send('undo');
    expect(useLogStore.getState().periods).toHaveLength(1);
    expect(reply()).toMatchObject({ fallback: { key: 'reply.undone' } });
  });

  it('adds her message and a reply', async () => {
    await send('hello');
    const m = useCompanionStore.getState().messages;
    expect(m.map((x) => x.role)).toEqual(['her', 'liora']);
    expect(m[1]!.blocks?.length).toBeGreaterThan(0);
    expect(useCompanionStore.getState().thinking).toBe(false);
  });

  it('ignores empty text', async () => {
    await send('   ');
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
      const sent = send('hello');
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
