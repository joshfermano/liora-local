import { describe, expect, it } from 'vitest';
import { mergeActions, planActions, readActions, type AgentAction } from './index';

const TODAY = '2026-10-10';
const tools = (text: string) => readActions(text, TODAY).map((a) => a.tool);
const one = <T extends AgentAction['tool']>(text: string, tool: T) =>
  readActions(text, TODAY).find((a) => a.tool === tool) as Extract<AgentAction, { tool: T }> | undefined;

describe('readActions: period', () => {
  it('reads "Niregla ako today" as a period start today', () => {
    expect(one('Niregla ako today', 'period_start')).toEqual({ tool: 'period_start', date: { kind: 'today' }, flow: null });
  });
  it('reads "nagkaroon ako ng regla kahapon" as a start yesterday', () => {
    expect(one('nagkaroon ako ng regla kahapon', 'period_start')?.date).toEqual({ kind: 'yesterday' });
  });
  it.each(['nireregla ako', 'nag-mens ako', 'dinatnan ako', 'dinalaw ako', 'may regla na ako', 'got my period', 'my period started', 'nagka-regla ako'])(
    'reads "%s" as a start with an unknown date',
    (text) => expect(one(text, 'period_start')?.date).toEqual({ kind: 'unknown' }),
  );
  it.each(['Nagsimula regla ko', 'nagsimula na ang regla ko', 'nag-simula ang mens ko', 'nag-start na period ko', 'I started my period'])(
    'reads "%s", with the verb first, as a period start',
    (text) => expect(one(text, 'period_start')?.date).toEqual({ kind: 'unknown' }),
  );
  it('reads the chat starter "Nagsimula regla ko ngayon" as a start today', () => {
    expect(one('Nagsimula regla ko ngayon', 'period_start')?.date).toEqual({ kind: 'today' });
  });
  it('reads "3 araw na" and "2 days ago" as days_ago', () => {
    expect(one('niregla ako 3 araw na', 'period_start')?.date).toEqual({ kind: 'days_ago', n: 3 });
    expect(one('got my period 2 days ago', 'period_start')?.date).toEqual({ kind: 'days_ago', n: 2 });
  });
  it('reads an explicit date', () => {
    expect(one('niregla ako noong 2026-10-05', 'period_start')?.date).toEqual({ kind: 'date', date: '2026-10-05' });
  });
  it('reads "tapos na regla ko" as a period end', () => {
    expect(tools('tapos na regla ko')).toEqual(['period_end']);
    expect(tools('my period ended yesterday')).toEqual(['period_end']);
  });
  it('does not start a period when she says "hindi pa ako niregla"', () => {
    expect(tools('hindi pa ako niregla')).not.toContain('period_start');
    expect(tools('not yet got my period')).not.toContain('period_start');
  });
  it('puts a flow said with a start inside the start', () => {
    expect(one('niregla ako ngayon, malakas', 'period_start')?.flow).toBe('heavy');
    expect(tools('niregla ako ngayon, malakas')).not.toContain('flow');
  });
});

describe('readActions: flow, symptoms, moods, activities, weeks', () => {
  it('reads "malakas ang regla ko ngayon" as heavy flow today', () => {
    expect(readActions('malakas ang regla ko ngayon', TODAY)).toEqual([{ tool: 'flow', date: { kind: 'today' }, flow: 'heavy' }]);
  });
  it.each([
    ['katamtaman ang regla ko', 'medium'],
    ['mahina ang regla ko', 'light'],
    ['konti lang regla ko', 'light'],
    ['spotting lang ako', 'spotting'],
    ['patak lang ngayon', 'spotting'],
  ])('reads flow in "%s"', (text, flow) => expect(one(text, 'flow')?.flow).toBe(flow));
  it('reads "masakit puson ko, pagod na pagod ako" as symptoms and a mood', () => {
    const a = readActions('masakit puson ko, pagod na pagod ako', TODAY);
    expect(a).toContainEqual({ tool: 'symptoms', date: { kind: 'today' }, symptoms: ['pelvic_pain', 'fatigue'] });
    expect(a).toContainEqual({ tool: 'moods', date: { kind: 'today' }, moods: ['tired'] });
  });
  it('never emits a danger code as a symptom', () => {
    expect(readActions('dinudugo ako at may lagnat', TODAY)).toEqual([]);
  });
  it('reads "nag-walk ako kanina, uminom ako ng tubig" as two activities today', () => {
    expect(one('nag-walk ako kanina, uminom ako ng tubig', 'activities')).toEqual({
      tool: 'activities',
      date: { kind: 'today' },
      activities: ['walk', 'water'],
    });
  });
  it.each([
    ['nag-exercise ako kahapon', 'exercise'],
    ['nag-yoga ako', 'exercise'],
    ['I went swimming', 'exercise'],
    ['nagpahinga ako', 'rest'],
    ['nakatulog nang maayos ako', 'slept_well'],
    ['nagpa-check-up ako', 'checkup_visit'],
    ['uminom ako ng gamot na reseta', 'medicine_taken'],
    ['I took my prescribed vitamins', 'medicine_taken'],
  ])('reads activity in "%s"', (text, code) => expect(one(text, 'activities')?.activities).toContain(code));
  it('skips an activity she says she did not do', () => {
    expect(tools('hindi ako nag-walk')).not.toContain('activities');
  });
  it('reads "32 weeks na ako" as weeks', () => {
    expect(readActions('32 weeks na ako', TODAY)).toEqual([{ tool: 'weeks', weeks: 32 }]);
  });
});

describe('readActions: questions and small talk', () => {
  it('reads "kailan next period ko?" as a cycle question only', () => {
    expect(readActions('kailan next period ko?', TODAY)).toEqual([{ tool: 'cycle_question' }]);
    expect(readActions('ano ang average cycle ko?', TODAY)).toEqual([{ tool: 'cycle_question' }]);
    expect(readActions('delayed ako', TODAY)).toEqual([{ tool: 'cycle_question' }]);
    expect(readActions('late na ang regla ko', TODAY)).toEqual([{ tool: 'cycle_question' }]);
    expect(readActions('my period is late', TODAY)).toEqual([{ tool: 'cycle_question' }]);
  });
  it('reads a health question and logs no activity from it', () => {
    expect(readActions('ok lang ba mag-exercise?', TODAY)).toEqual([{ tool: 'health_question' }]);
  });
  it('reads greetings as smalltalk', () => {
    expect(readActions('Hi Liora, kumusta?', TODAY)).toEqual([{ tool: 'smalltalk' }]);
    expect(readActions('salamat', TODAY)).toEqual([{ tool: 'smalltalk' }]);
  });
  it('returns nothing for an empty message', () => {
    expect(readActions('', TODAY)).toEqual([]);
  });
});

describe('readActions: delete, clear, undo, look up, open', () => {
  it('reads "Remove the logged period from today" as only a period delete', () => {
    expect(readActions('Remove the logged period from today', TODAY)).toEqual([{ tool: 'delete_period', date: { kind: 'today' } }]);
  });
  it('reads "alisin mo yung regla ko kahapon" as a delete yesterday', () => {
    expect(readActions('alisin mo yung regla ko kahapon', TODAY)).toEqual([{ tool: 'delete_period', date: { kind: 'yesterday' } }]);
  });
  it.each(['delete my period on Oct 8', 'burahin ang regla noong Oktubre 8', 'tanggalin ang regla ko 2026-10-08'])('reads "%s" as a delete on Oct 8', (text) => {
    expect(readActions(text, TODAY)).toEqual([{ tool: 'delete_period', date: { kind: 'date', date: '2026-10-08' } }]);
  });
  it('does not delete when she only says her period started', () => {
    expect(tools('niregla ako today')).not.toContain('delete_period');
  });
  it.each([
    ['clear my log today', 'all'],
    ['alisin ang nilog ko today', 'all'],
    ['remove my symptoms today', 'symptoms'],
    ['burahin ang sintomas ko kahapon', 'symptoms'],
    ['remove my moods today', 'moods'],
    ['remove my activities today', 'activities'],
    ['remove the flow today', 'flow'],
  ])('reads "%s" as clear_day %s', (text, what) => {
    expect(one(text, 'clear_day')?.what).toBe(what);
    expect(tools(text)).toEqual(['clear_day']);
  });
  it('reads the date of a clear', () => {
    expect(one('burahin ang sintomas ko kahapon', 'clear_day')?.date).toEqual({ kind: 'yesterday' });
  });
  it.each(['undo', 'i-undo mo', 'bawiin mo', 'ibalik mo'])('reads "%s" as undo_last', (text) => {
    expect(readActions(text, TODAY)).toEqual([{ tool: 'undo_last' }]);
  });
  it.each([
    ['ano ang nilog ko kahapon', { kind: 'yesterday' }],
    ['ano nilog ko kahapon?', { kind: 'yesterday' }],
    ['what did I log yesterday', { kind: 'yesterday' }],
    ['what did I log today?', { kind: 'today' }],
  ])('reads "%s" as ask_day', (text, date) => {
    expect(readActions(text, TODAY)).toEqual([{ tool: 'ask_day', date }]);
  });
  it.each([
    ['open my calendar', 'calendar'],
    ['buksan mo calendar', 'calendar'],
    ['open the mood check', 'mood_check'],
    ['buksan ang checklist', 'checklist'],
    ['open my profile', 'profile'],
    ['log my day', 'log_day'],
  ])('reads "%s" as open %s', (text, screen) => {
    expect(readActions(text, TODAY)).toEqual([{ tool: 'open', screen }]);
  });
  it('reads thanks as smalltalk', () => {
    expect(readActions('thank you so much', TODAY)).toEqual([{ tool: 'smalltalk' }]);
    expect(readActions('maraming salamat po', TODAY)).toEqual([{ tool: 'smalltalk' }]);
  });
  it('keeps logging when thanks come with a symptom', () => {
    expect(tools('salamat, masakit ang ulo ko')).toContain('symptoms');
  });
});

describe('mergeActions', () => {
  const rules: AgentAction[] = [{ tool: 'flow', date: { kind: 'today' }, flow: 'heavy' }];
  it('keeps the rules action when both have the tool', () => {
    expect(mergeActions(rules, [{ tool: 'flow', date: { kind: 'yesterday' }, flow: 'light' }])).toEqual(rules);
  });
  it('adds a tool only Gemma found, once', () => {
    const w: AgentAction = { tool: 'weeks', weeks: 20 };
    expect(mergeActions(rules, [w, { tool: 'weeks', weeks: 21 }])).toEqual([...rules, w]);
  });
});

describe('readActions: more than one thing in a message', () => {
  it('logs and opens in the same message', () => {
    expect(readActions('log headache and open calendar', TODAY)).toEqual([
      { tool: 'symptoms', date: { kind: 'today' }, symptoms: ['headache'] },
      { tool: 'open', screen: 'calendar' },
    ]);
  });

  it('still reads a bare open on its own', () => {
    expect(readActions('open mood check', TODAY)).toEqual([{ tool: 'open', screen: 'mood_check' }]);
  });

  it('logs both days when she names yesterday and today', () => {
    expect(readActions('masakit ulo ko kahapon at ngayon', TODAY)).toEqual([
      { tool: 'symptoms', date: { kind: 'yesterday' }, symptoms: ['headache'] },
      { tool: 'symptoms', date: { kind: 'today' }, symptoms: ['headache'] },
    ]);
  });
});

describe('readActions: weekdays and more words', () => {
  it('reads "last monday" as the monday before today', () => {
    expect(readActions('i had cramps last monday', TODAY)).toEqual([{ tool: 'symptoms', date: { kind: 'date', date: '2026-10-05' }, symptoms: ['cramps'] }]);
  });

  it('reads "noong Lunes" the same way', () => {
    expect(readActions('masakit puson ko noong Lunes', TODAY)[0]).toMatchObject({ date: { kind: 'date', date: '2026-10-05' } });
  });

  it('reads "mabigat ang regla ko" as a heavy flow', () => {
    expect(readActions('mabigat ang regla ko', TODAY)).toEqual([{ tool: 'flow', date: { kind: 'today' }, flow: 'heavy' }]);
  });
});

describe('readActions: her name', () => {
  it.each([['change my name to Bea', 'Bea'], ['call me Bea', 'Bea'], ['tawagin mo akong Ate Bea', 'Ate Bea'], ['palitan mo pangalan ko ng Maria po', 'Maria']])('reads "%s"', (text, name) => {
    expect(readActions(text, TODAY)).toEqual([{ tool: 'set_name', name }]);
  });

  it.each(['call me later', 'my name is not important', 'call me back tomorrow', 'tawagin mo ako mamaya'])('does not rename for "%s"', (text) => {
    expect(readActions(text, TODAY).some((a) => a.tool === 'set_name')).toBe(false);
  });

  it('asks before changing it', () => {
    expect(planActions([{ tool: 'set_name', name: 'Bea' }], { periods: [], dayLogs: [], cycleSettings: {}, setup: null }, 'neither', TODAY).confirm).toHaveLength(1);
  });
});

describe('readActions: periods she did not get', () => {
  it.each(['hindi pala ako niregla', "I didn't get my period"])('logs nothing for "%s"', (text) => {
    expect(readActions(text, TODAY).some((a) => a.tool === 'period_start')).toBe(false);
  });
});

describe('readActions: a question that also reports', () => {
  it('logs "is it normal na masakit ulo ko?"', () => {
    expect(readActions('is it normal na masakit ulo ko?', TODAY).map((a) => a.tool)).toContain('symptoms');
  });

  it('does not log a general question', () => {
    expect(readActions('normal ba sumakit likod pag buntis?', TODAY).map((a) => a.tool)).not.toContain('symptoms');
    expect(readActions('ano pwede kong gawin para hindi mapagod?', TODAY).map((a) => a.tool)).not.toContain('symptoms');
  });

  it('reads "best time to get pregnant" as a cycle question', () => {
    expect(readActions("what's the best time to get pregnant?", TODAY)).toEqual([{ tool: 'cycle_question' }]);
  });

  it('reads "nitong linggo" as this week, not Sunday', () => {
    expect(readActions('masakit puson ko nitong linggo', TODAY)[0]).toMatchObject({ date: { kind: 'today' } });
  });

  it('skips renaming her to the name she already has', () => {
    const data = { periods: [], dayLogs: [], cycleSettings: {}, setup: { name: 'Ana' } };
    expect(planActions([{ tool: 'set_name', name: 'Ana' }], data, 'neither', TODAY)).toEqual({ apply: [], confirm: [] });
  });
});

describe('readActions: plans are not logs', () => {
  it.each(['regular checkup ako bukas', 'magpapa-check-up ako bukas', 'mag-walk ako mamaya', 'I will go for a walk tomorrow', 'check-up ko sa Oct 20'])('logs nothing for "%s"', (text) => {
    expect(readActions(text, TODAY).some((a) => a.tool === 'activities')).toBe(false);
  });

  it('still logs what already happened', () => {
    expect(readActions('nag-check up ako kanina', TODAY)).toEqual([{ tool: 'activities', date: { kind: 'today' }, activities: ['checkup_visit'] }]);
  });
});

describe('readActions: questions about her cycle, however they are asked', () => {
  it.each(['do i have ovulation', 'am i ovulating', 'when do i ovulate', 'fertile ba ako', 'is my next period soon', 'may ovulation ba ako ngayon'])('"%s" is a cycle question', (text) => {
    expect(readActions(text, TODAY)).toEqual([{ tool: 'cycle_question' }]);
  });

  it.each(['what is ovulation?', 'ano ang ibig sabihin ng fertile window?'])('"%s" asks what a word means', (text) => {
    expect(readActions(text, TODAY)).toEqual([{ tool: 'health_question' }]);
  });
});

