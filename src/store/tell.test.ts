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
import { setAskModel, setRetrieveCard, useTellStore } from './tell';

const HEADACHE = { 'yesno.severe_headache': [0.9], 'severe.severe_headache': [0.9], 'mild.severe_headache': [0.05] };

beforeEach(async () => {
  setAskModel(null);
  setRetrieveCard(null);
  useTellStore.getState().reset();
  useTellStore.getState().setContext({ status: 'pregnant' });
  await useLogStore.getState().deleteEverything();
});
afterEach(() => vi.useRealTimers());

describe('tell store', () => {
  it('attaches the closest reviewed card to a calm answer', async () => {
    setRetrieveCard(async () => 'pcpnc-m2-any-concern');
    const entry = await useTellStore.getState().submit('medyo masakit ang balakang ko');
    expect(entry.decision.level).toBe('ok');
    expect(entry.card_ids).toEqual(['pcpnc-m2-any-concern']);
  });

  it('does not search cards when the rules say go now', async () => {
    let asked = false;
    setRetrieveCard(async () => {
      asked = true;
      return 'pcpnc-m2-any-concern';
    });
    const entry = await useTellStore.getState().submit('sobrang sakit ng ulo ko tapos malabo paningin');
    expect(entry.decision.level).toBe('go_now');
    expect(entry.card_ids).toEqual([]);
    expect(asked).toBe(false);
  });

  it('still answers when the card search fails', async () => {
    setRetrieveCard(async () => {
      throw new Error('embedder not loaded');
    });
    const entry = await useTellStore.getState().submit('medyo masakit ang balakang ko');
    expect(entry.decision.level).toBe('ok');
    expect(entry.card_ids).toEqual([]);
  });

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

describe('the status the rules use', () => {
  it('follows her saved profile, so a restart never resets her to pregnant', () => {
    useLogStore.setState({ setup: { status: 'postpartum', days_since_birth: 10 } });
    expect(useTellStore.getState().context).toEqual({ status: 'postpartum', days_since_birth: 10 });
    useLogStore.setState({ setup: { status: 'pregnant', weeks: 30 } });
    expect(useTellStore.getState().context).toEqual({ status: 'pregnant', weeks: 30 });
  });
});

describe("triage decides which of Gemma's danger answers count", () => {
  // Gemma answering yes to bleeding for any message that mentions a period.
  const saysBleeding = vi.fn(async () => ({ 'yesno.vaginal_bleeding': [0.95, 0.05] }));
  beforeEach(() => {
    saysBleeding.mockClear();
    setAskModel(saysBleeding, { role: 'llm', id: 'test', version: '1' });
  });

  it('never asks Gemma about danger for an edit to her data', async () => {
    useLogStore.setState({ setup: { status: 'neither' } });
    const entry = await useTellStore.getState().submit('Can you remove my period logged this month?');
    expect(saysBleeding).not.toHaveBeenCalled();
    expect(entry.decision.level).toBe('ok');
  });

  it("ignores Gemma's bleeding answer when she logs a period and is not pregnant", async () => {
    useLogStore.setState({ setup: { status: 'neither' } });
    const entry = await useTellStore.getState().submit('Niregla ako today');
    expect(entry.decision.level).toBe('ok');
  });

  it('keeps bleeding as a danger sign while she is pregnant', async () => {
    useLogStore.setState({ setup: { status: 'pregnant', weeks: 20 } });
    const entry = await useTellStore.getState().submit('Niregla ako today');
    expect(entry.decision.level).toBe('go_now');
  });
});
