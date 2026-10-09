import { describe, expect, it } from 'vitest';
import { herAnswer } from './her-data';
import type { AgentData } from './types';

const TODAY = '2026-10-10';
const P = (id: string, start: string, end: string | null) => ({ id, start, end, flow_by_day: {}, source: 'calendar' as const });
const D = (date: string, part: Partial<AgentData['dayLogs'][number]>) => ({ date, flow: null, symptoms: [], moods: [], activities: [], ...part });

// Three months of real use: cycles of 29, 29 and 27 days, periods of 5, 5 and 6 days, one running now.
const ANA: AgentData = {
  periods: [P('a', '2026-07-16', '2026-07-20'), P('b', '2026-08-14', '2026-08-18'), P('c', '2026-09-12', '2026-09-17'), P('d', '2026-10-09', null)],
  dayLogs: [
    D('2026-10-09', { flow: 'heavy', symptoms: ['cramps', 'fatigue'], moods: ['irritable'] }),
    D('2026-10-08', { symptoms: ['headache', 'bloating'], moods: ['anxious'] }),
    D('2026-10-05', { activities: ['exercise'], moods: ['joyful'] }),
    D('2026-09-28', { symptoms: ['headache'] }),
  ],
  cycleSettings: {},
  setup: { status: 'neither' },
};
const NEW: AgentData = { periods: [], dayLogs: [], cycleSettings: {}, setup: { status: 'neither' } };
const ask = (text: string, data = ANA, status = 'neither') => herAnswer(text, data, status, TODAY);

describe('answering from her own logs', () => {
  it.each([
    ['anong cycle day ko ngayon?', 'her.cycle_day', { n: '2' }],
    ['kailan nagsimula huling regla ko?', 'her.last_period', { date: 'Oct 9' }],
    ['when did my last period start?', 'her.last_period', { date: 'Oct 9' }],
    ['gaano kahaba ang cycle ko?', 'her.cycle_length', { n: '28', k: '3' }],
    ['ilang araw usually ang regla ko?', 'her.period_length', { n: '5', k: '3' }],
    ['regular ba ang cycle ko?', 'her.cycle_range', { k: '3', min: '27', max: '29' }],
    ['may regla ba ako ngayon?', 'her.on_period.yes', { date: 'Oct 9' }],
    ['am I on my period?', 'her.on_period.yes', { date: 'Oct 9' }],
    ['kailan huling sumakit ulo ko?', 'her.last_sign', { date: 'Oct 8' }],
    ['kelan last mens ko?', 'her.last_period', { date: 'Oct 9' }],
    ['how long do my periods usually last?', 'her.period_length', { n: '5' }],
    ['ilang araw na ako may regla?', 'her.period_day', { n: '2', date: 'Oct 9' }],
  ])('"%s"', (text, key, params) => {
    expect(ask(text)).toMatchObject({ key, params });
  });

  it('counts a sign over the month', () => {
    expect(ask('how many times did I have a headache this month?')).toMatchObject({ key: 'her.count_sign.one', params: { n: '1', from: 'Oct 1' } });
    expect(ask('ilang beses ako nag-headache?')).toMatchObject({ key: 'her.count_sign', params: { n: '2', from: 'Sep 11' } });
  });

  it('lists her moods this week', () => {
    expect(ask('how have I been feeling lately?')).toMatchObject({ key: 'her.moods', moods: ['irritable', 'anxious', 'joyful'] });
  });

  it('lists the days she logged this week, newest first', () => {
    expect(ask('ano nilog ko this week?')?.days?.map((d) => d.date)).toEqual(['2026-10-09', '2026-10-08', '2026-10-05']);
    expect(ask('show me my logs this week')?.key).toBe('her.week');
  });

  it('says how many days until the next period, and whether she is late', () => {
    const notNow = { ...ANA, periods: ANA.periods.slice(0, 3) };
    expect(herAnswer('ilang araw pa bago ang next period ko?', notNow, 'neither', '2026-10-01')).toMatchObject({ key: 'her.days_until' });
    expect(herAnswer('late ba ako?', notNow, 'neither', '2026-10-20')).toMatchObject({ key: 'her.late.yes' });
  });

  it('does not call a single cycle or period an average', () => {
    const two = { ...ANA, periods: [P('c', '2026-09-12', '2026-09-17'), P('d', '2026-10-09', null)] };
    expect(ask('gaano kahaba ang cycle ko?', two)).toEqual({ key: 'her.cycle_length.one', params: { n: '27' } });
    expect(ask('ilang araw usually ang regla ko?', two)).toEqual({ key: 'her.period_length.one', params: { n: '6' } });
  });

  it('says plainly when there is nothing logged yet', () => {
    expect(ask('anong cycle day ko?', NEW)).toEqual({ key: 'her.no_periods' });
    expect(ask('may regla ba ako ngayon?', NEW)).toEqual({ key: 'her.on_period.no' });
  });

  it.each([
    'how many days until my check-up?',
    'how often should I take medicine for a headache?',
    'is it okay to eat regular food?',
    'regular checkup ako bukas',
    'am i still bleeding?',
    'how long should I rest after exercise?',
  ])('does not answer "%s" from her cycle', (text) => {
    expect(ask(text)).toBeNull();
  });

  it('leaves logs, other questions and pregnancy to the other tools', () => {
    expect(ask('masakit ulo ko')).toBeNull();
    expect(ask('kailan next period ko?')).toBeNull();
    expect(ask('anong cycle day ko?', ANA, 'pregnant')).toBeNull();
  });
});
