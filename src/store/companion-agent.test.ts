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

const WRITES = ['period_start', 'period_end', 'flow', 'symptoms', 'moods', 'activities', 'weeks', 'delete_period', 'clear_day'];
const core = vi.hoisted(() => ({
  readActions: vi.fn(),
  mergeActions: vi.fn(),
  planActions: vi.fn(),
  applyActions: vi.fn(),
  toneOf: vi.fn(),
  contextPack: vi.fn(),
  cycleFacts: vi.fn(),
  dayFacts: vi.fn(),
  triage: vi.fn(),
}));
vi.mock('../core/agent', async (importOriginal) => ({ ...(await importOriginal<object>()), ...core }));

import type { ReplyRequest } from '../core/agent';
import type { ReplyBlock } from '../core/companion';
import { setRouteActions, setSayReply } from './agent';
import { useCompanionStore } from './companion';
import { useJournalStore } from './journal';
import { useLogStore } from './log';
import { setRetrieveCard } from './tell';

const purposeOf = (actions: { tool: string }[]) => {
  const has = (...t: string[]) => actions.some((a) => t.includes(a.tool));
  if (has(...WRITES, 'undo_last')) return 'update';
  if (has('ask_day', 'open', 'cycle_question')) return 'ask';
  if (has('smalltalk')) return 'chat';
  return has('health_question') ? 'health' : 'unclear';
};

const START = { tool: 'period_start', date: { kind: 'today' }, flow: null } as const;
const PERIOD = { id: 'p1', start: '2026-10-10', end: null, flow_by_day: {}, source: 'tell' as const };
const OLD = { ...PERIOD, id: 'p0', start: '2026-09-01' };
const applied = {
  data: { periods: [PERIOD] },
  undo: { periods: [] },
  saved: [{ kind: 'period_start', date: '2026-10-10' }],
};

const send = (text: string) => useCompanionStore.getState().send(text);
const last = () => useCompanionStore.getState().messages.at(-1)!;
const blocks = (): ReplyBlock[] => last().blocks ?? [];
const kinds = () => blocks().map((b) => b.kind);
const reply = () => {
  const b = blocks().find((x) => x.kind === 'reply');
  if (b?.kind !== 'reply') throw new Error('no reply block');
  return b;
};

describe('companion agent turn', () => {
  beforeEach(() => {
    useCompanionStore.getState().clear();
    useJournalStore.getState().clear();
    useLogStore.setState({ entries: [], setup: null, moods: [], periods: [], dayLogs: [], cycleSettings: {} });
    setRouteActions(null);
    setSayReply(null);
    setRetrieveCard(null);
    core.readActions.mockReset().mockReturnValue([]);
    core.mergeActions.mockReset().mockImplementation((rules: unknown[], gemma: unknown[]) => [...rules, ...gemma]);
    core.planActions.mockReset().mockImplementation((actions: { tool: string }[]) => ({ apply: actions.filter((a) => WRITES.includes(a.tool)), confirm: [] }));
    core.applyActions.mockReset().mockReturnValue(applied);
    core.toneOf.mockReset().mockReturnValue('neutral');
    core.triage.mockReset().mockImplementation(() => {
      const actions = core.readActions();
      return { purpose: purposeOf(actions), typed: 'all', actions };
    });
    core.contextPack.mockReset().mockReturnValue({ text: 'Cycle day: 3', facts: { her_data: 'Cycle day: 3' } });
    core.cycleFacts.mockReset().mockReturnValue({ cycle_day: 3, next_period: 'Oct 23 to Oct 27' });
    core.dayFacts.mockReset().mockReturnValue({ date: 'Oct 9', symptoms: ['cramps'] });
  });

  describe('one reply', () => {
    it('answers "Hi" with exactly one reply block and no template text', async () => {
      core.readActions.mockReturnValue([{ tool: 'smalltalk' }]);
      await send('Hi');
      expect(kinds().filter((k) => k === 'reply')).toHaveLength(1);
      expect(kinds()).not.toContain('text');
      expect(kinds()).not.toContain('warm');
      expect(reply()).toEqual({ kind: 'reply', text: null, fallback: { key: 'reply.greeting.anon' } });
    });

    it('greets by name', async () => {
      useLogStore.setState({ setup: { name: 'Gweny' } });
      core.readActions.mockReturnValue([{ tool: 'smalltalk' }]);
      await send('Hi');
      expect(reply().fallback).toEqual({ key: 'reply.greeting', params: { name: 'Gweny' } });
    });

    it('answers "Thank you!" with the thanks line when Gemma is off, whether or not the rules saw it', async () => {
      core.readActions.mockReturnValue([{ tool: 'smalltalk' }]);
      await send('Thank you!');
      expect(reply().fallback).toEqual({ key: 'reply.thanks' });
      core.readActions.mockReturnValue([]);
      await send('Thank you so much, Liora');
      expect(reply().fallback).toEqual({ key: 'reply.thanks' });
      expect(kinds()).toEqual(['reply']);
    });

    it('says what it can do when nothing was understood', async () => {
      await send('asdf qwer');
      expect(reply().fallback).toEqual({ key: 'reply.other' });
      expect(kinds()).toEqual(['reply', 'actions']);
    });

    it('puts Gemma\'s words in the one reply block and gives it her data and the facts', async () => {
      core.readActions.mockReturnValue([{ tool: 'smalltalk' }]);
      useLogStore.setState({ setup: { name: 'Gweny' } });
      const say = vi.fn(async (_req: ReplyRequest) => 'Hi Gweny! What shall we log today?');
      setSayReply(say);
      await send('Hi');
      expect(reply().text).toBe('Hi Gweny! What shall we log today?');
      const req = say.mock.calls[0]![0];
      expect(req.text).toBe('Hi');
      expect(req.pack).toBe('Cycle day: 3');
      expect(req.facts).toMatchObject({ her_name: 'Gweny', she_said: 'hello' });
      expect(req.allowed).toMatchObject({ her_data: 'Cycle day: 3', her_name: 'Gweny' });
    });

    it('hands over the last six turns as she saw them', async () => {
      const say = vi.fn(async (_req: ReplyRequest) => null);
      setSayReply(say);
      for (const t of ['one', 'two', 'three', 'four']) await send(t);
      const thread = say.mock.calls[3]![0].thread;
      expect(thread).toHaveLength(6);
      expect(thread.at(-1)).toEqual({ role: 'liora', text: expect.stringContaining('I can log your period') });
      expect(thread.at(-2)).toEqual({ role: 'her', text: 'three' });
    });
  });

  describe('streaming', () => {
    it('shows only guarded text, keeps thinking on until the reply is done, then clears it', async () => {
      core.readActions.mockReturnValue([START]);
      let first: () => void = () => {};
      let second: () => void = () => {};
      const gate1 = new Promise<void>((r) => (first = r));
      const gate2 = new Promise<void>((r) => (second = r));
      setSayReply(async (_req, onText) => {
        await gate1;
        onText?.('Done!');
        await gate2;
        return 'Done! I noted it.';
      });
      const sending = send('Niregla ako today');
      await vi.waitFor(() => expect(kinds()).toContain('logged'));
      expect(reply().text).toBeNull();
      expect(useCompanionStore.getState().thinking).toBe(true);
      first();
      await vi.waitFor(() => expect(reply().text).toBe('Done!'));
      expect(useCompanionStore.getState().thinking).toBe(true);
      second();
      await sending;
      expect(reply().text).toBe('Done! I noted it.');
      expect(useCompanionStore.getState().thinking).toBe(false);
    });

    it('keeps the fixed fallback when the guard leaves nothing, the model fails or there is no model', async () => {
      core.readActions.mockReturnValue([START]);
      setSayReply(async () => null);
      await send('Niregla ako today');
      expect(reply()).toMatchObject({ text: null, fallback: { key: 'reply.saved' } });
      setSayReply(async () => {
        throw new Error('no model');
      });
      await send('Niregla ako today');
      expect(reply().text).toBeNull();
      expect(useCompanionStore.getState().thinking).toBe(false);
    });
  });

  describe('tools', () => {
    it('saves a clear log at once under the reply, with Undo', async () => {
      core.readActions.mockReturnValue([START]);
      await send('Niregla ako today');
      expect(useLogStore.getState().periods).toEqual([PERIOD]);
      expect(kinds()).toEqual(['reply', 'logged']);
      expect(reply().fallback.key).toBe('reply.saved');
      expect(kinds()).not.toContain('period_confirm');
    });

    it('deletes a logged period with a period_deleted line and a bright reply', async () => {
      useLogStore.setState({ periods: [PERIOD] });
      core.readActions.mockReturnValue([{ tool: 'delete_period', date: { kind: 'today' } }]);
      core.applyActions.mockReturnValue({ data: { periods: [] }, undo: { periods: [PERIOD] }, saved: [{ kind: 'period_deleted', date: '2026-10-10' }] });
      const say = vi.fn(async (_req: ReplyRequest) => 'Done! Tinanggal ko na ang period mo ngayon.');
      setSayReply(say);
      await send('Remove the logged period from today');
      expect(useLogStore.getState().periods).toEqual([]);
      const logged = blocks().find((b) => b.kind === 'logged');
      expect(logged).toMatchObject({ kind: 'logged', items: [{ kind: 'period_deleted', date: '2026-10-10' }] });
      expect(reply()).toMatchObject({ text: 'Done! Tinanggal ko na ang period mo ngayon.', fallback: { key: 'reply.deleted' } });
      expect(say.mock.calls[0]![0].facts.removed).toEqual([expect.stringContaining('removed the period')]);
    });

    it('says it could not find what she asked to remove', async () => {
      core.readActions.mockReturnValue([{ tool: 'delete_period', date: { kind: 'today' } }]);
      core.applyActions.mockReturnValue({ data: {}, undo: {}, saved: [] });
      await send('Remove the period from today');
      expect(reply().fallback.key).toBe('reply.not_found');
      expect(kinds()).toEqual(['reply']);
    });

    it('undo_last puts the old data back, drops the old Undo and says so', async () => {
      useLogStore.setState({ periods: [OLD] });
      core.readActions.mockReturnValue([START]);
      core.applyActions.mockReturnValue({ ...applied, undo: { periods: [OLD] } });
      await send('Niregla ako today');
      expect(useLogStore.getState().periods).toEqual([PERIOD]);
      const first = last().id;

      core.readActions.mockReturnValue([{ tool: 'undo_last' }]);
      const say = vi.fn(async (_req: ReplyRequest) => 'Okay, binawi ko na.');
      setSayReply(say);
      await send('undo');
      expect(useLogStore.getState().periods).toEqual([OLD]);
      expect(core.applyActions).toHaveBeenCalledTimes(1);
      expect(useCompanionStore.getState().messages.find((m) => m.id === first)!.blocks?.some((b) => b.kind === 'logged')).toBe(false);
      expect(reply()).toMatchObject({ text: 'Okay, binawi ko na.', fallback: { key: 'reply.undone' } });
      expect(say.mock.calls[0]![0].facts.undone).toEqual([expect.stringContaining('period start')]);

      await send('undo');
      expect(reply().fallback.key).toBe('reply.nothing_to_undo');
      expect(useLogStore.getState().periods).toEqual([OLD]);
    });

    it('keeps only the latest Undo: an older button gets false', async () => {
      core.readActions.mockReturnValue([START]);
      await send('Niregla ako today');
      const old = blocks().find((b) => b.kind === 'logged');
      await send('Niregla ako today');
      const fresh = blocks().find((b) => b.kind === 'logged');
      if (old?.kind !== 'logged' || fresh?.kind !== 'logged') throw new Error('no logged block');
      expect(useCompanionStore.getState().undo(old.undoId)).toBe(false);
      expect(useCompanionStore.getState().undo(fresh.undoId)).toBe(true);
      expect(useCompanionStore.getState().undo(fresh.undoId)).toBe(false);
    });

    it('confirm applies the waiting actions and adds a logged block; no drops them', async () => {
      core.readActions.mockReturnValue([START]);
      core.planActions.mockImplementation((actions: unknown[]) => ({ apply: [], confirm: actions }));
      await send('Niregla ako');
      expect(core.applyActions).not.toHaveBeenCalled();
      expect(reply().fallback.key).toBe('reply.confirm');
      const ask = blocks().find((b) => b.kind === 'confirm');
      if (ask?.kind !== 'confirm') throw new Error('no confirm block');
      expect(ask.actions).toEqual([START]);
      useCompanionStore.getState().confirm(ask.confirmId, true);
      expect(useLogStore.getState().periods).toEqual([PERIOD]);
      expect(kinds()).toContain('logged');
      expect(kinds()).not.toContain('confirm');

      core.applyActions.mockClear();
      await send('Niregla ako');
      const again = blocks().find((b) => b.kind === 'confirm');
      if (again?.kind !== 'confirm') throw new Error('no confirm block');
      useCompanionStore.getState().confirm(again.confirmId, false);
      expect(core.applyActions).not.toHaveBeenCalled();
      expect(kinds()).not.toContain('confirm');
      expect(kinds()).not.toContain('logged');
    });

    it('answers what she logged on a day from her data', async () => {
      core.readActions.mockReturnValue([{ tool: 'ask_day', date: { kind: 'yesterday' } }]);
      const say = vi.fn(async (_req: ReplyRequest) => null);
      setSayReply(say);
      await send('Ano ang nilog ko kahapon?');
      expect(reply().fallback.key).toBe('reply.day_empty');
      expect(say.mock.calls[0]![0].facts).toMatchObject({ day: 'yesterday', symptoms: ['cramps'], anything_logged_that_day: false });
      useLogStore.setState({ dayLogs: [{ date: '2026-10-09', flow: null, symptoms: ['cramps'], moods: [], activities: [] }] });
      core.dayFacts.mockClear();
      await send('Ano ang nilog ko kahapon?');
      expect(core.dayFacts).toHaveBeenCalledWith(expect.anything(), expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    });

    it('answers a cycle question from cycle facts, with the cycle answer attached when there is one', async () => {
      useLogStore.setState({ setup: { status: 'neither' } });
      core.readActions.mockReturnValue([{ tool: 'cycle_question' }]);
      const say = vi.fn(async (_req: ReplyRequest) => null);
      setSayReply(say);
      await send('Kailan next period ko?');
      expect(reply().fallback.key).toBe('companion.cycle.no_data');
      expect(say.mock.calls[0]![0].facts).toMatchObject({ cycle_day: 3, next_period: 'Oct 23 to Oct 27' });
      expect(kinds()).toContain('actions');
    });

    it('shows a found source card verbatim and says it is below; without one it points to the check-up', async () => {
      core.readActions.mockReturnValue([{ tool: 'health_question' }]);
      const say = vi.fn(async (_req: ReplyRequest) => null);
      setSayReply(say);
      setRetrieveCard(async () => 'card-1');
      await send('Ano ang prenatal vitamins?');
      expect(blocks().find((b) => b.kind === 'card')).toEqual({ kind: 'card', cardId: 'card-1' });
      expect(reply().fallback.key).toBe('reply.card');
      expect(say.mock.calls[0]![0].facts.source_card).toMatch(/below/);
      setRetrieveCard(null);
      await send('Ano ang prenatal vitamins?');
      expect(kinds()).not.toContain('card');
      expect(reply().fallback.key).toBe('reply.no_card');
      expect(say.mock.calls[1]![0].facts.source_card).toBe('none found');
    });

    it('opens a screen with an actions block', async () => {
      core.readActions.mockReturnValue([{ tool: 'open', screen: 'calendar' }]);
      await send('open the calendar');
      expect(blocks().find((b) => b.kind === 'actions')).toEqual({ kind: 'actions', items: ['calendar'] });
      expect(reply().fallback.key).toBe('reply.open');
    });
  });

  describe('routing by purpose', () => {
    it('treats an urgent triage as a danger turn even when the entry looks calm', async () => {
      core.triage.mockReturnValue({ purpose: 'urgent', typed: 'all', actions: [START] });
      const say = vi.fn(async () => 'x');
      setSayReply(say);
      await send('hello');
      expect(say).not.toHaveBeenCalled();
      expect(core.applyActions).not.toHaveBeenCalled();
      expect(kinds()).not.toContain('reply');
    });

    it('answers a question about her own data from her data: no card, no router, Gemma gets the pack', async () => {
      core.triage.mockReturnValue({ purpose: 'ask', typed: 'none', actions: [] });
      const route = vi.fn(async () => []);
      setRouteActions(route);
      setRetrieveCard(async () => 'card-1');
      const say = vi.fn(async (_req: ReplyRequest) => 'Ikaw ay nasa cycle day 3.');
      setSayReply(say);
      await send('ilang weeks na ako?');
      expect(route).not.toHaveBeenCalled();
      expect(kinds()).not.toContain('card');
      expect(reply()).toMatchObject({ text: 'Ikaw ay nasa cycle day 3.', fallback: { key: 'reply.other' } });
      expect(say.mock.calls[0]![0]).toMatchObject({ pack: 'Cycle day: 3' });
      expect(say.mock.calls[0]![0].facts).toMatchObject({ she_asked_about_her_own_data: true });
    });
  });

  describe('safety', () => {
    it('writes nothing and asks Gemma for nothing on a go-now entry', async () => {
      core.readActions.mockReturnValue([START]);
      const say = vi.fn(async () => 'x');
      setSayReply(say);
      await send('nanganganak na ako at sobrang dami ng dugo');
      expect(core.applyActions).not.toHaveBeenCalled();
      expect(say).not.toHaveBeenCalled();
      expect(useLogStore.getState().periods).toEqual([]);
      expect(kinds()).toContain('decision');
      expect(kinds()).not.toContain('reply');
      expect(kinds()).not.toContain('logged');
    });
  });

  it('asks Gemma to route only when the rules read nothing', async () => {
    const route = vi.fn(async () => [{ tool: 'smalltalk' } as const]);
    setRouteActions(route);
    await send('asdf qwer');
    expect(route).toHaveBeenCalledTimes(1);
    expect(reply().fallback.key).toBe('reply.greeting.anon');
    core.readActions.mockReturnValue([START]);
    await send('Niregla ako today');
    expect(route).toHaveBeenCalledTimes(1);
  });

  it('saves a voice entry with input voice', async () => {
    await useCompanionStore.getState().send('magandang gabi po', 'voice');
    expect(useLogStore.getState().entries[0]!.input).toBe('voice');
  });
});
