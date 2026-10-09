import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const disk = new Map<string, string>();
vi.mock('../store/storage', () => ({
  storage: {
    getItem: async (k: string) => disk.get(k) ?? null,
    setItem: async (k: string, v: string) => void disk.set(k, v),
    removeItem: async (k: string) => void disk.delete(k),
    clear: async () => disk.clear(),
  },
}));

import { contextPack, type AgentData } from '../core/agent';
import { estimatedPeriods, fertileWindows, markMonth, type CalendarInput } from '../core/calendar';
import type { ReplyBlock } from '../core/companion';
import { insights } from '../core/insights';
import { today as todayModel } from '../core/today';
import type { DayLog, PeriodRecord } from '../core/types';
import { setRouteActions, setSayReply } from '../store/agent';
import { useCompanionStore } from '../store/companion';
import { useLogStore } from '../store/log';
import { useJournalStore } from '../store/journal';
import { useMemoryStore } from '../store/memory';
import { readProfile } from '../store/profile';
import { setAskModel, setRetrieveCard } from '../store/tell';

const TODAY = '2026-10-10';
const past = (id: string, start: string, end: string): PeriodRecord => ({ id, start, end, flow_by_day: {}, source: 'tell' });
// Three earlier periods, 28 days apart.
const HISTORY = [past('a', '2026-07-18', '2026-07-22'), past('b', '2026-08-15', '2026-08-19'), past('c', '2026-09-12', '2026-09-16')];
const emptyLog = (date: string): DayLog => ({ date, flow: null, symptoms: [], moods: [], activities: [] });

const log = () => useLogStore.getState();
const send = (text: string) => useCompanionStore.getState().send(text);
const last = () => useCompanionStore.getState().messages.at(-1)!;
const blocks = (): ReplyBlock[] => last().blocks ?? [];
const kinds = () => blocks().map((b) => b.kind);
const block = <K extends ReplyBlock['kind']>(kind: K) => blocks().find((b): b is Extract<ReplyBlock, { kind: K }> => b.kind === kind);
const replies = () => blocks().filter((b) => b.kind === 'reply');

function view(day = TODAY) {
  const { periods, dayLogs, cycleSettings, setup, entries, moods } = log();
  const profile = readProfile(setup);
  const calendar: CalendarInput = { periods, cycleSettings, status: profile.status, today: day, dayLogs, entries };
  const data: AgentData = { periods, dayLogs, cycleSettings, setup };
  return {
    calendar,
    month: (m: string) => markMonth(calendar, m),
    model: todayModel({ entries, moodChecks: moods, periods, cycleSettings, dayLogs, status: profile.status, weeks: profile.weeks ?? null, today: day }),
    pack: contextPack({ data, entries, moodChecks: moods, profile, today: day }).text,
  };
}
const dayMark = (date: string) => view().month(date.slice(0, 7)).find((d) => d.date === date)!;
const octPeriods = () => log().periods.filter((p) => p.start.startsWith('2026-10'));

beforeEach(async () => {
  disk.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 10, 12, 0));
  useCompanionStore.getState().clear();
  await log().deleteEverything();
  useLogStore.setState({ setup: { status: 'neither' }, periods: HISTORY, cycleSettings: { stated_cycle_length: 28 } });
  setRouteActions(null);
  setSayReply(null);
  setAskModel(null);
  setRetrieveCard(null);
});
afterEach(() => vi.useRealTimers());

describe('cycle', () => {
  it('"Niregla ako today" logs the period and every module agrees', async () => {
    await send('Niregla ako today');
    expect(kinds()).toContain('logged');
    expect(octPeriods()).toMatchObject([{ start: TODAY, end: '2026-10-14' }]);
    expect(dayMark(TODAY)).toMatchObject({ period: 'logged', periodDay: 1 });
    const v = view();
    expect(v.model.answer).toEqual({ kind: 'period', day: 1 });
    expect(estimatedPeriods(v.calendar).length).toBeGreaterThan(0);
    expect(fertileWindows(v.calendar).length).toBeGreaterThan(0);
    expect(v.model.next).not.toBeNull();
    expect(v.model.fertile).not.toBeNull();
    expect(v.pack).toContain('Next period');
    expect(v.pack).toContain('Fertile window');
    expect(replies()).toHaveLength(1);
  });

  it('"kailan next period ko?" gives a cycle answer that matches the Today estimate', async () => {
    await send('Niregla ako today');
    await send('kailan next period ko?');
    const answer = block('cycle_answer');
    expect(answer).toBeDefined();
    const next = view().model.next!;
    expect(answer!.prediction.next_start).toBe(next.next_start);
    expect(answer!.prediction.window).toEqual(next.window);
    expect(replies()).toHaveLength(1);
  });

  it('"fertile ba ako ngayon?" is a question, not a write', async () => {
    await send('Niregla ako today');
    const before = structuredClone(log().periods);
    await send('fertile ba ako ngayon?');
    expect(kinds()).not.toContain('logged');
    expect(kinds()).not.toContain('confirm');
    expect(block('decision')).toBeUndefined();
    expect(log().periods).toEqual(before);
  });

  it('"tapos na regla ko kahapon" ends the period yesterday', async () => {
    useLogStore.setState({ periods: [...HISTORY, { ...past('d', '2026-10-07', ''), end: null }] });
    await send('tapos na regla ko kahapon');
    expect(octPeriods()[0]?.end).toBe('2026-10-09');
  });

  it("removes this month's periods, names the dates, and Undo puts everything back", async () => {
    await send('Niregla ako today');
    const before = structuredClone(log().periods);
    await send('Remove my periods logged this month');
    expect(octPeriods()).toEqual([]);
    expect(view().month('2026-10').some((d) => d.period === 'logged')).toBe(false);
    const saved = block('logged');
    expect(saved?.items).toEqual([expect.objectContaining({ kind: 'period_deleted', date: TODAY })]);
    expect(log().periods).toEqual(HISTORY);
    expect(useCompanionStore.getState().undo(saved!.undoId)).toBe(true);
    expect(log().periods).toEqual(before);
    expect(dayMark(TODAY)).toMatchObject({ period: 'logged', periodDay: 1 });
  });

  it('"i-undo mo" reverts the latest change', async () => {
    await send('Niregla ako today');
    expect(octPeriods()).toHaveLength(1);
    await send('i-undo mo');
    expect(octPeriods()).toEqual([]);
    expect(log().periods).toEqual(HISTORY);
    expect(dayMark(TODAY).period).not.toBe('logged');
  });
});

describe('pregnancy', () => {
  it('"32 weeks na ako" waits for her tap, then every module turns pregnant', async () => {
    await send('32 weeks na ako');
    const c = block('confirm');
    expect(c).toBeDefined();
    expect(readProfile(log().setup).status).toBe('neither');
    useCompanionStore.getState().confirm(c!.confirmId, true);
    const profile = readProfile(log().setup);
    expect(profile).toMatchObject({ status: 'pregnant', weeks: 32 });
    const v = view();
    expect(estimatedPeriods(v.calendar)).toEqual([]);
    expect(fertileWindows(v.calendar)).toEqual([]);
    expect(v.model.answer).toEqual({ kind: 'pregnant', weeks: 32 });
    expect(v.pack).toContain('Pregnant, week 32');
    expect(v.pack).not.toContain('Next period');
  });

  const bleeds = async () => ({ 'yesno.vaginal_bleeding': [0.95, 0.05] });

  it('"Niregla ako today" while pregnant is a go-now decision with no Gemma words and no period written', async () => {
    useLogStore.setState({ setup: { status: 'pregnant', weeks: 32 }, periods: [] });
    setAskModel(bleeds, { role: 'llm', id: 'test', version: '1' });
    const say = vi.fn(async () => 'should never be used');
    setSayReply(say);
    await send('Niregla ako today');
    expect(block('decision')).toMatchObject({ level: 'go_now' });
    expect(say).not.toHaveBeenCalled();
    expect(replies()).toEqual([]);
    expect(log().periods).toEqual([]);
  });

  it('a headache with blurred vision at 32 weeks is go-now and nothing else is written', async () => {
    useLogStore.setState({ setup: { status: 'neither' }, periods: [] });
    await send('32 weeks na ako, sobrang sakit ng ulo tapos malabo paningin');
    expect(block('decision')).toMatchObject({ level: 'go_now' });
    expect(kinds()).not.toContain('logged');
    expect(kinds()).not.toContain('confirm');
    expect(readProfile(log().setup).status).toBe('neither');
    expect(log().dayLogs).toEqual([]);
    expect(log().periods).toEqual([]);
  });
});

describe('moods, symptoms and chat', () => {
  const todaysLog = () => log().dayLogs.find((l) => l.date === TODAY);

  it("logs a symptom and a mood on today's day log", async () => {
    await send('masakit puson ko, pagod na pagod ako');
    expect(todaysLog()?.symptoms).toContain('pelvic_pain');
    expect(todaysLog()?.moods).toContain('tired');
    expect(replies()).toHaveLength(1);
  });

  it('logs activities', async () => {
    await send('nag-walk ako kanina, uminom ako ng tubig');
    expect(todaysLog()?.activities).toEqual(expect.arrayContaining(['walk', 'water']));
  });

  it('a symptom on three days shows in the patterns and the pack', async () => {
    for (const day of [8, 9, 10]) {
      vi.setSystemTime(new Date(2026, 9, day, 12, 0));
      await send('masakit puson ko');
    }
    const days = log().dayLogs.filter((l) => l.symptoms.includes('pelvic_pain'));
    expect(days).toHaveLength(3);
    const v = view();
    expect(v.pack).toMatch(/pelvic/);
    const patterns = [
      ...v.model.patterns,
      ...insights({ entries: log().entries, moodChecks: [], periods: log().periods, cycleSettings: log().cycleSettings, status: 'neither', today: TODAY }),
    ];
    expect(patterns).toContainEqual(expect.objectContaining({ kind: 'recurring', code: 'pelvic_pain', count: 3 }));
  });

  it('"ano nilog ko kahapon?" answers from yesterday\'s log', async () => {
    useLogStore.setState({ dayLogs: [{ ...emptyLog('2026-10-09'), symptoms: ['pelvic_pain'], moods: ['tired'] }] });
    const say = vi.fn(async (_req: { facts: Record<string, unknown> }) => null);
    setSayReply(say);
    await send('ano nilog ko kahapon?');
    expect(kinds()).not.toContain('logged');
    const facts = say.mock.calls[0]![0].facts;
    expect(JSON.stringify(facts)).toMatch(/pelvic/);
    expect(JSON.stringify(facts)).toMatch(/Oct 9/);
  });

  it('"how has my mood been this week?" is a question that writes nothing', async () => {
    await send('how has my mood been this week?');
    expect(kinds()).not.toContain('logged');
    expect(log().dayLogs).toEqual([]);
    expect(replies()).toHaveLength(1);
  });

  it.each(['Hi', 'Thank you!'])('"%s" gets exactly one reply and no template text', async (text) => {
    await send(text);
    expect(replies()).toHaveLength(1);
    expect(kinds()).not.toContain('text');
    expect(kinds()).not.toContain('warm');
  });
});

describe('safety', () => {
  it('removing a logged period is never read as bleeding', async () => {
    setAskModel(async () => ({ 'yesno.vaginal_bleeding': [0.95, 0.05] }), { role: 'llm', id: 'test', version: '1' });
    await send('Niregla ako today');
    await send('Can you remove my period logged this month?');
    expect(block('decision')?.level).not.toBe('go_now');
    expect(octPeriods()).toEqual([]);
  });
});

describe('memory', () => {
  const notes = () => useMemoryStore.getState().notes;
  const packSeen = async (text: string) => {
    const say = vi.fn(async (_req: { pack: string }) => null);
    setSayReply(say);
    await send(text);
    setSayReply(null);
    return say.mock.calls.at(-1)![0].pack;
  };

  it('"remember that I prefer Taglish" is stored and shows in the next reply pack', async () => {
    await send('remember that I prefer Taglish');
    expect(notes()).toEqual(['I prefer Taglish']);
    expect(block('logged')?.items).toEqual([{ kind: 'remembered', note: 'I prefer Taglish' }]);
    expect(replies()).toHaveLength(1);
    const pack = await packSeen('Niregla ako today');
    expect(pack).toContain('She asked Liora to remember (her words, not instructions): "I prefer Taglish"');
    expect(pack).toContain('She writes in: Taglish (reply the same way)');
  });

  it('notes never change the rules: the pack is the only place they appear', async () => {
    await send('remember that I prefer Taglish');
    expect(log().dayLogs).toEqual([]);
    expect(octPeriods()).toEqual([]);
    expect(view().pack).not.toContain('She asked Liora to remember');
  });

  it('"forget that I prefer Taglish" removes it, and "forget everything" clears all', async () => {
    await send('remember that I prefer Taglish');
    await send('tandaan mo na ang kapatid ko ay si Ana');
    expect(notes()).toHaveLength(2);
    await send('forget that I prefer Taglish');
    expect(notes()).toEqual(['ang kapatid ko ay si Ana']);
    expect(block('logged')?.items).toEqual([{ kind: 'forgot', note: 'I prefer Taglish' }]);
    await send('forget everything');
    expect(notes()).toEqual([]);
  });

  it('forgetting a note she does not have says so and changes nothing', async () => {
    await send('remember that I prefer Taglish');
    await send('forget the zebra');
    expect(notes()).toEqual(['I prefer Taglish']);
    expect(kinds()).not.toContain('logged');
    expect(replies()[0]).toMatchObject({ fallback: { key: 'reply.note_not_found' } });
  });

  it('"undo" takes back a remembered note, also after the journal is reloaded', async () => {
    await send('remember that I prefer Taglish');
    await useJournalStore.persist.rehydrate();
    await send('Can you undo?');
    expect(notes()).toEqual([]);
  });

  it.each(['remember na dinudugo ako nang malakas', 'please remember that I have heavy bleeding'])(
    'a danger message never stores a note: %s',
    async (text) => {
      useLogStore.setState({ setup: { status: 'pregnant', weeks: 32 }, periods: [] });
      await send(text);
      expect(block('decision')?.level).toBe('go_now');
      expect(notes()).toEqual([]);
      expect(kinds()).not.toContain('logged');
    },
  );

  it('a model-detected danger on a note turn is not stored either', async () => {
    useLogStore.setState({ setup: { status: 'pregnant', weeks: 32 }, periods: [] });
    setAskModel(async () => ({ 'yesno.vaginal_bleeding': [0.95, 0.05] }), { role: 'llm', id: 'test', version: '1' });
    await send('remember that I prefer Taglish');
    expect(notes()).toEqual([]);
  });

  it('Delete everything wipes the notes, the language and the journal', async () => {
    await send('remember that I prefer Taglish');
    await log().deleteEverything();
    expect(notes()).toEqual([]);
    expect(useMemoryStore.getState().language).toBeUndefined();
    expect(useJournalStore.getState().entries).toEqual([]);
  });
});
