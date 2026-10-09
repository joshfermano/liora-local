import { describe, expect, it } from 'vitest';
import { mergeActions, readActions, type AgentAction } from './index';

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
