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

import { setRouteActions, setSayReply } from './agent';
import { useCompanionStore } from './companion';
import { useLogStore } from './log';
import { setAskModel, setRetrieveCard } from './tell';
import { pushTrace, toTrace, TRACE_LIMIT, useTraceStore, type TurnTrace } from './trace';
import { beginProbe, endProbe, noteDropped, noteHit, notePrompt, noteTurn, timed } from '../core/probe';

const trace = (n: number): TurnTrace => ({
  at: `2026-10-10T00:00:${String(n % 60).padStart(2, '0')}Z`,
  purpose: 'chat',
  typedScope: 'none',
  tools: [],
  cacheHits: [],
  ms: { triage: 0, typed: 0, route: 0, reply: 0, total: n },
  guardDropped: 0,
  fallback: false,
  promptVersions: {},
});

beforeEach(async () => {
  await useLogStore.getState().deleteEverything();
  useLogStore.setState({ setup: { status: 'neither' } });
  setAskModel(null);
  setRouteActions(null);
  setSayReply(null);
  setRetrieveCard(null);
});

describe('trace ring buffer', () => {
  it('keeps the newest 50, newest first', () => {
    let list: TurnTrace[] = [];
    for (let i = 0; i < TRACE_LIMIT + 5; i++) list = pushTrace(list, trace(i));
    expect(list).toHaveLength(50);
    expect(list[0]?.ms.total).toBe(54);
    expect(list.at(-1)?.ms.total).toBe(5);
  });

  it('is wiped by Delete everything', async () => {
    useTraceStore.getState().add(trace(1));
    await useLogStore.getState().deleteEverything();
    expect(useTraceStore.getState().traces).toEqual([]);
    expect(disk.get('tell-liora-trace') ?? '').not.toContain('"purpose"');
  });
});

describe('probe', () => {
  it('turns what a turn noted into a trace, and does nothing outside a turn', () => {
    noteHit('typed');
    expect(endProbe()).toBeNull();
    beginProbe();
    noteTurn({ purpose: 'update', typedScope: 'no_bleeding', tools: ['period_start'], fallback: false });
    noteHit('typed');
    noteHit('typed');
    notePrompt('typed', '1.abc');
    noteDropped(2);
    return timed('route', async () => {}).then(() => {
      const t = toTrace(endProbe()!, 120, new Date('2026-10-10T01:00:00Z'));
      expect(t).toMatchObject({
        at: '2026-10-10T01:00:00.000Z',
        purpose: 'update',
        typedScope: 'no_bleeding',
        tools: ['period_start'],
        cacheHits: ['typed'],
        guardDropped: 2,
        fallback: false,
        promptVersions: { typed: '1.abc' },
      });
      expect(t.ms.total).toBe(120);
    });
  });
});

describe('a real turn leaves one trace', () => {
  it('records purpose, tools, timings and prompt versions, and no message text', async () => {
    useTraceStore.getState().clear();
    setSayReply(async () => 'Got it, I noted that.');
    await useCompanionStore.getState().send('Niregla ako today');
    const [t] = useTraceStore.getState().traces;
    expect(useTraceStore.getState().traces).toHaveLength(1);
    expect(t).toMatchObject({ purpose: 'update', tools: ['period_start'], fallback: false });
    expect(t!.ms.total).toBeGreaterThanOrEqual(t!.ms.reply);
    expect(JSON.stringify(t)).not.toMatch(/niregla|noted/i);
  });

  it('marks a turn with no Gemma words as a fallback', async () => {
    useTraceStore.getState().clear();
    await useCompanionStore.getState().send('Hi');
    expect(useTraceStore.getState().traces[0]).toMatchObject({ purpose: 'chat', fallback: true });
  });

  it('notes a repeated danger question as a cache hit', async () => {
    useTraceStore.getState().clear();
    const ref = { role: 'llm' as const, id: 'test', version: '1', prompts: { typed: '1.abc' } };
    setAskModel(async () => ({}), ref);
    await useCompanionStore.getState().send('masakit puson ko');
    await useCompanionStore.getState().send('masakit puson ko');
    const [second, first] = useTraceStore.getState().traces;
    expect(first?.cacheHits).not.toContain('typed');
    expect(second?.cacheHits).toContain('typed');
    expect(second?.promptVersions.typed).toBe('1.abc');
  });
});
