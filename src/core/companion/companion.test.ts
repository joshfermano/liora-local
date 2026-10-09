import { describe, expect, it } from 'vitest';
import { runPipeline } from '../pipeline';
import type { Context, PeriodRecord } from '../types';
import { composeReply, ruleIntent } from './index';

const NOW = new Date('2026-10-09T15:00:00+08:00');
const TODAY = '2026-10-09';
const entryFor = (text: string, context: Context = { status: 'pregnant' }) =>
  runPipeline({ id: 'e1', now: NOW, text, input: 'text', context });
const period = (start: string): PeriodRecord => ({ id: start, start, end: null, flow_by_day: {}, source: 'calendar' });
const base = { periods: [] as PeriodRecord[], cycleSettings: {}, today: TODAY, cardId: null as string | null };

describe('what her message is about', () => {
  it('reads a danger sign as a symptom first, whatever else she says', () => {
    expect(ruleIntent('hi! sobrang sakit ng ulo ko tapos malabo paningin', entryFor('hi! sobrang sakit ng ulo ko tapos malabo paningin'))).toBe('symptom');
  });
  it('reads a period she mentions', () => {
    expect(ruleIntent('nagsimula regla ko kahapon', entryFor('nagsimula regla ko kahapon', { status: 'neither' }))).toBe('period');
  });
  it('reads a feeling', () => {
    expect(ruleIntent('ang lungkot ko ngayon', entryFor('ang lungkot ko ngayon'))).toBe('mood');
  });
  it('reads a question about her own cycle', () => {
    expect(ruleIntent('kailan next period ko?', entryFor('kailan next period ko?', { status: 'neither' }))).toBe('cycle_question');
  });
  it('reads a greeting', () => {
    expect(ruleIntent('hello Liora', entryFor('hello Liora'))).toBe('greeting');
  });
  it('reads any other question as a health question', () => {
    expect(ruleIntent('pwede ba akong mag-kape?', entryFor('pwede ba akong mag-kape?'))).toBe('health_question');
  });
});

describe('the reply', () => {
  it('shows the go-now decision in the thread when the rules say so, even for a greeting', () => {
    const entry = entryFor('hi sobrang sakit ng ulo ko tapos malabo paningin');
    const blocks = composeReply({ ...base, intent: 'greeting', entry, context: { status: 'pregnant' } });
    expect(blocks).toContainEqual({ kind: 'decision', entryId: 'e1', level: 'go_now' });
  });

  it('asks the follow-up in the thread when severity is unclear', () => {
    const entry = entryFor('masakit ulo ko');
    expect(composeReply({ ...base, intent: 'symptom', entry, context: { status: 'pregnant' } })).toContainEqual({ kind: 'decision', entryId: 'e1', level: 'follow_up' });
  });

  it('offers to log a period she mentions, with the date to confirm', () => {
    const entry = entryFor('nagsimula regla ko kahapon', { status: 'neither' });
    const blocks = composeReply({ ...base, intent: 'period', entry, context: { status: 'neither' } });
    expect(blocks).toContainEqual(expect.objectContaining({ kind: 'period_confirm', date: '2026-10-08' }));
  });

  it('answers a cycle question from her own logs', () => {
    const entry = entryFor('kailan next period ko?', { status: 'neither' });
    const periods = [period('2026-07-01'), period('2026-07-29'), period('2026-08-26'), period('2026-09-23')];
    const blocks = composeReply({ ...base, periods, intent: 'cycle_question', entry, context: { status: 'neither' } });
    const answer = blocks.find((b) => b.kind === 'cycle_answer');
    expect(answer).toMatchObject({ kind: 'cycle_answer', prediction: { next_start: '2026-10-21', basis: 'history' } });
  });

  it('gives no period estimate while she is pregnant', () => {
    const entry = entryFor('kailan next period ko?');
    const blocks = composeReply({ ...base, intent: 'cycle_question', entry, context: { status: 'pregnant' } });
    expect(blocks.some((b) => b.kind === 'cycle_answer')).toBe(false);
    expect(blocks).toContainEqual({ kind: 'text', key: 'companion.cycle.pregnant' });
  });

  it('notes a feeling and offers the private mood check', () => {
    const entry = entryFor('ang lungkot ko ngayon');
    const blocks = composeReply({ ...base, intent: 'mood', entry, context: { status: 'pregnant' } });
    expect(blocks).toContainEqual(expect.objectContaining({ kind: 'mood_noted' }));
    expect(blocks).toContainEqual({ kind: 'actions', items: ['mood_check'] });
  });

  it('answers a health question with a reviewed card when one matches, never with generated text', () => {
    const entry = entryFor('pwede ba akong mag-kape?');
    const withCard = composeReply({ ...base, cardId: 'pcpnc-m2-any-concern', intent: 'health_question', entry, context: { status: 'pregnant' } });
    expect(withCard).toContainEqual({ kind: 'card', cardId: 'pcpnc-m2-any-concern' });
    const without = composeReply({ ...base, intent: 'health_question', entry, context: { status: 'pregnant' } });
    expect(without).toContainEqual({ kind: 'text', key: 'companion.health.ask' });
  });

  it('greets her by name', () => {
    const entry = entryFor('hello');
    expect(composeReply({ ...base, name: 'Ana', intent: 'greeting', entry, context: { status: 'pregnant' } })).toContainEqual({ kind: 'text', key: 'companion.greeting', params: { name: 'Ana' } });
  });
});

describe('companion copy', () => {
  it('has fixed copy for every text and action the companion can show', async () => {
    const { COPY } = await import('../../content/copy');
    const keys = [
      'companion.symptom.go_now', 'companion.symptom.follow_up', 'companion.symptom.ok', 'companion.period.heard',
      'companion.period.when', 'companion.mood.noted', 'companion.cycle.pregnant', 'companion.cycle.postpartum',
      'companion.cycle.no_data', 'companion.health.card', 'companion.health.ask', 'companion.greeting',
      'companion.greeting.anon', 'companion.other',
      ...['checklist', 'mood_check', 'calendar', 'log_period'].map((a) => `companion.action.${a}`),
    ];
    expect(keys.filter((k) => !(k in COPY))).toEqual([]);
  });
});
