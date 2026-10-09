import { describe, expect, it } from 'vitest';
import { dayHasData, replyPlan, smalltalkKind, type Outcome } from './outcome';
import type { AgentData } from './types';

const TODAY = '2026-10-10';
const none: Outcome = { saved: [], waiting: false, undid: null, nothingToUndo: false, notFound: false, cycle: null, day: null, card: null, opened: null, smalltalk: null, asksAboutHerData: false };
const plan = (o: Partial<Outcome>, c: Partial<Parameters<typeof replyPlan>[1]> = {}) =>
  replyPlan({ ...none, ...o }, { tone: 'neutral', today: TODAY, ...c });

describe('smalltalkKind', () => {
  it.each([
    ['Thank you!', 'thanks'],
    ['thanks po', 'thanks'],
    ['Maraming salamat, Liora', 'thanks'],
    ['Hi', 'greeting'],
    ['Hello po', 'greeting'],
    ['Magandang umaga', 'greeting'],
    ['Kumusta ka?', 'greeting'],
    ['niregla ako today', null],
  ])('reads %s', (text, kind) => expect(smalltalkKind(text)).toBe(kind));
});

describe('replyPlan fallback', () => {
  it('says thanks, never the old template', () => {
    expect(plan({ smalltalk: 'thanks' }).fallback).toEqual({ key: 'reply.thanks' });
  });
  it('greets by name when it knows one', () => {
    expect(plan({ smalltalk: 'greeting' }, { name: 'Gweny' }).fallback).toEqual({ key: 'reply.greeting', params: { name: 'Gweny' } });
    expect(plan({ smalltalk: 'greeting' }).fallback).toEqual({ key: 'reply.greeting.anon' });
  });
  it('says what it can do when nothing was understood', () => {
    const p = plan({});
    expect(p.fallback).toEqual({ key: 'reply.other' });
    expect(p.facts.no_action_taken).toBe(true);
    expect(p.facts.i_can_help_with).toEqual(expect.any(Array));
  });
  it('says saved, deleted, undone and not found for what happened', () => {
    expect(plan({ saved: [{ kind: 'period_start', date: TODAY }] }).fallback.key).toBe('reply.saved');
    expect(plan({ saved: [{ kind: 'period_deleted', date: TODAY }] }).fallback.key).toBe('reply.deleted');
    expect(plan({ saved: [{ kind: 'day_cleared', date: TODAY, what: 'moods' }] }).fallback.key).toBe('reply.deleted');
    expect(plan({ saved: [{ kind: 'period_deleted', date: TODAY }, { kind: 'flow', date: TODAY, flow: 'light' }] }).fallback.key).toBe('reply.saved');
    expect(plan({ undid: [{ kind: 'period_start', date: TODAY }] }).fallback.key).toBe('reply.undone');
    expect(plan({ nothingToUndo: true }).fallback.key).toBe('reply.nothing_to_undo');
    expect(plan({ notFound: true }).fallback.key).toBe('reply.not_found');
    expect(plan({ waiting: true }).fallback.key).toBe('reply.confirm');
  });
  it('answers cycle, day, card and open questions', () => {
    expect(plan({ cycle: { facts: { cycle_day: 3 }, textKey: null } }).fallback.key).toBe('reply.cycle');
    expect(plan({ cycle: { facts: {}, textKey: 'companion.cycle.pregnant' } }).fallback.key).toBe('companion.cycle.pregnant');
    expect(plan({ day: { date: TODAY, facts: {}, hasData: true } }).fallback.key).toBe('reply.day');
    expect(plan({ day: { date: TODAY, facts: {}, hasData: false } }).fallback.key).toBe('reply.day_empty');
    expect(plan({ card: true }).fallback.key).toBe('reply.card');
    expect(plan({ card: false }).fallback.key).toBe('reply.no_card');
    expect(plan({ opened: 'calendar' }).fallback.key).toBe('reply.open');
  });
  it('lets a saved log win over small talk', () => {
    expect(plan({ saved: [{ kind: 'period_start', date: TODAY }], smalltalk: 'thanks' }).fallback.key).toBe('reply.saved');
  });
});

describe('replyPlan facts', () => {
  it('marks a question about her own data and does not call it unhandled', () => {
    const p = plan({ asksAboutHerData: true });
    expect(p.facts.she_asked_about_her_own_data).toBe(true);
    expect(p.facts).not.toHaveProperty('no_action_taken');
    expect(p.fallback.key).toBe('reply.other');
  });
  it('writes saved and removed lines in plain words with dates from code', () => {
    const f = plan({
      saved: [
        { kind: 'period_start', date: '2026-10-09' },
        { kind: 'symptoms', date: TODAY, values: ['cramps', 'back_pain'] },
        { kind: 'period_deleted', date: '2026-10-01' },
        { kind: 'day_cleared', date: TODAY, what: 'moods' },
      ],
    }).facts;
    expect(f.saved).toEqual(['period start logged for yesterday', 'symptoms logged for today: cramps, back pain']);
    expect(f.removed).toEqual(['removed the period that started Oct 1', 'cleared the moods logged for today']);
  });
  it('carries her name, and her tone only when it is not neutral', () => {
    expect(plan({ smalltalk: 'greeting' }, { name: 'Gweny' }).facts).toMatchObject({ her_name: 'Gweny' });
    expect(plan({ smalltalk: 'greeting' }).facts).not.toHaveProperty('her_tone');
    expect(plan({ smalltalk: 'greeting' }, { tone: 'sad' }).facts).toMatchObject({ her_tone: 'sad' });
    expect(plan({ smalltalk: 'greeting' }, { tone: 'worried' }).facts).toMatchObject({ her_tone: 'scared' });
  });
  it('merges cycle and day facts and says whether a card is below', () => {
    const f = plan({
      cycle: { facts: { cycle_day: 3 }, textKey: null },
      day: { date: '2026-10-09', facts: { flow_that_day: 'light' }, hasData: true },
      card: true,
    }).facts;
    expect(f).toMatchObject({ cycle_day: 3, flow_that_day: 'light', day: 'yesterday', anything_logged_that_day: true });
    expect(String(f.source_card)).toMatch(/below/);
    expect(plan({ card: false }).facts.source_card).toBe('none found');
  });
  it('marks undo, a missing target and a waiting confirmation', () => {
    const f = plan({ undid: [{ kind: 'weeks', weeks: 12 }], nothingToUndo: false, notFound: true, waiting: true }).facts;
    expect(f.undone).toEqual(['set to 12 weeks pregnant']);
    expect(f.could_not_find_it_on_her_calendar).toBe(true);
    expect(f.waiting_for_her_tap_to_save).toBe(true);
  });
});

describe('dayHasData', () => {
  const base: AgentData = { periods: [], dayLogs: [], cycleSettings: {}, setup: null };
  const log = { date: TODAY, flow: null, symptoms: [], moods: [], activities: [] };
  it('is false for an empty day', () => {
    expect(dayHasData(base, TODAY)).toBe(false);
    expect(dayHasData({ ...base, dayLogs: [log] }, TODAY)).toBe(false);
  });
  it('is true for a log with content or a period that covers the day', () => {
    expect(dayHasData({ ...base, dayLogs: [{ ...log, moods: ['sad'] }] }, TODAY)).toBe(true);
    expect(dayHasData({ ...base, dayLogs: [{ ...log, flow: 'light' }] }, TODAY)).toBe(true);
    const period = { id: 'p', start: '2026-10-08', end: '2026-10-11', flow_by_day: {}, source: 'tell' as const };
    expect(dayHasData({ ...base, periods: [period] }, TODAY)).toBe(true);
    expect(dayHasData({ ...base, periods: [period] }, '2026-10-12')).toBe(false);
  });
});
