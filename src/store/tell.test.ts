import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { setAskModel, useTellStore } from './tell';

const HEADACHE = { 'yesno.severe_headache': [0.9], 'severe.severe_headache': [0.9], 'mild.severe_headache': [0.05] };

beforeEach(async () => {
  setAskModel(null);
  useTellStore.getState().reset();
  useTellStore.getState().setContext({ status: 'pregnant' });
  await useLogStore.getState().deleteEverything();
});
afterEach(() => vi.useRealTimers());

describe('tell store', () => {
  const GEMMA = { role: 'llm' as const, id: 'gemma-4-E2B-it Q4_0', version: 'llama.rn 0.13.0-rc.7' };

  it('records the model that answered, for "How Liora decided"', async () => {
    setAskModel(async () => HEADACHE, GEMMA);
    const entry = await useTellStore.getState().submit('sobrang sakit ng ulo ko');
    expect(entry.models).toEqual([GEMMA]);
  });

  it('records no model when the model failed and the word list decided alone', async () => {
    setAskModel(async () => {
      throw new Error('out of memory');
    }, GEMMA);
    const entry = await useTellStore.getState().submit('masakit ulo ko');
    expect(entry.models).toEqual([]);
  });

  it('starts idle with a pregnant context', () => {
    const s = useTellStore.getState();
    expect(s.status).toBe('idle');
    expect(s.context).toEqual({ status: 'pregnant' });
    expect(s.current).toBeNull();
    expect(s.error).toBeNull();
  });

  it('submits with the lexicon alone when no model is set, and saves the entry', async () => {
    const entry = await useTellStore.getState().submit('masakit ulo ko');
    const s = useTellStore.getState();
    expect(s.status).toBe('done');
    expect(s.current).toEqual(entry);
    expect(entry.decision.follow_up?.code).toBe('severe_headache');
    expect(useLogStore.getState().entries[0]?.id).toBe(entry.id);
  });

  it('uses the typed answers from the model', async () => {
    setAskModel(async () => HEADACHE);
    const entry = await useTellStore.getState().submit('masakit ulo ko', 'voice');
    expect(entry.input).toBe('voice');
    expect(entry.decision.level).toBe('go_now');
    expect(entry.findings[0]?.sources).toEqual(expect.arrayContaining(['llm']));
  });

  it('falls back to the lexicon when the model throws', async () => {
    setAskModel(async () => {
      throw new Error('boom');
    });
    const entry = await useTellStore.getState().submit('masakit ulo ko');
    expect(useTellStore.getState().status).toBe('done');
    expect(entry.decision.level).toBe('follow_up');
  });

  it('falls back to the lexicon after 8 seconds', async () => {
    vi.useFakeTimers();
    setAskModel(() => new Promise(() => undefined));
    const pending = useTellStore.getState().submit('masakit ulo ko');
    expect(useTellStore.getState().status).toBe('thinking');
    await vi.advanceTimersByTimeAsync(8000);
    const entry = await pending;
    expect(entry.decision.level).toBe('follow_up');
    expect(useTellStore.getState().status).toBe('done');
  });

  it('answers the follow-up, re-decides and updates the saved entry', async () => {
    const first = await useTellStore.getState().submit('masakit ulo ko');
    const next = await useTellStore.getState().answerFollowUp('skip');
    expect(next.id).toBe(first.id);
    expect(next.decision.level).toBe('go_now');
    expect(useTellStore.getState().current).toEqual(next);
    expect(useLogStore.getState().entries).toHaveLength(1);
    expect(useLogStore.getState().entries[0]?.decision.level).toBe('go_now');
  });

  it('rejects a follow-up answer with nothing to answer', async () => {
    await expect(useTellStore.getState().answerFollowUp('yes')).rejects.toThrow();
  });

  it('reset clears the current entry but keeps the context', async () => {
    useTellStore.getState().setContext({ status: 'postpartum', days_since_birth: 3 });
    await useTellStore.getState().submit('masakit ulo ko');
    useTellStore.getState().reset();
    const s = useTellStore.getState();
    expect(s.status).toBe('idle');
    expect(s.current).toBeNull();
    expect(s.context.status).toBe('postpartum');
  });
});
