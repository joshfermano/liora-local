import { describe, expect, it } from 'vitest';
import type { PeriodRecord } from '../types';
import { cycleFacts, dayFacts, guardReply, type AgentData, type Facts } from './index';

const TODAY = '2026-10-09';
const period = (start: string, end: string): PeriodRecord => ({ id: `p-${start}`, start, end, flow_by_day: {}, source: 'calendar' });
const data = (over: Partial<AgentData> = {}): AgentData => ({ periods: [], dayLogs: [], cycleSettings: {}, setup: null, ...over });
const steady = data({ periods: [period('2026-07-25', '2026-07-29'), period('2026-08-22', '2026-08-26'), period('2026-09-23', '2026-09-27')] });

describe('cycleFacts', () => {
  it('gives weeks when pregnant and only the status after birth', () => {
    expect(cycleFacts(data({ setup: { weeks: 32 } }), 'pregnant', TODAY)).toEqual({ status: 'pregnant', weeks: 32 });
    expect(cycleFacts(data({ setup: {} }), 'pregnant', TODAY)).toEqual({ status: 'pregnant', weeks: null });
    expect(cycleFacts(data(), 'postpartum', TODAY)).toEqual({ status: 'postpartum' });
  });
  it('words the cycle day, next period window and fertile window', () => {
    const f = cycleFacts(steady, 'neither', TODAY);
    expect(f.cycle_day).toBe(17);
    expect(f.period_today).toBe(false);
    expect(f.cycles_logged).toBe(3);
    expect(f.next_period).toMatch(/^[A-Z][a-z]{2} \d{1,2} to [A-Z][a-z]{2} \d{1,2}$/);
    expect(['low', 'medium', 'high']).toContain(f.next_period_confidence);
  });
  it('says period_today while a logged period covers today', () => {
    expect(cycleFacts(data({ periods: [period('2026-10-07', '2026-10-11')] }), undefined, TODAY).period_today).toBe(true);
  });
  it('has no estimate without any logged period', () => {
    expect(cycleFacts(data(), 'neither', TODAY)).toMatchObject({ cycle_day: null, next_period: null, fertile_window: null, cycles_logged: 0 });
  });
});

describe('dayFacts', () => {
  it('lists what she logged that day', () => {
    const d = data({ dayLogs: [{ date: TODAY, flow: 'light', symptoms: ['cramps'], moods: ['calm'], activities: ['walk'], note: 'tired legs' }] });
    expect(dayFacts(d, TODAY)).toEqual({ date: 'Oct 9', flow: 'light', symptoms: ['cramps'], moods: ['calm'], activities: ['walk'], note: 'tired legs', anything_logged: true });
  });
  it('says nothing was logged for an empty day', () => {
    expect(dayFacts(data(), TODAY)).toEqual({ date: 'Oct 9', flow: null, symptoms: [], moods: [], activities: [], note: null, anything_logged: false });
  });
});

describe('guardReply', () => {
  const facts: Facts = { date: 'Oct 9', next_period: 'Oct 21 to Oct 25', cycle_day: 17, symptoms: ['cramps'] };
  it('keeps plain confirmations and facts it was given', () => {
    const removed = { ...facts, removed: ['removed the period that started today'] };
    expect(guardReply('Done! I removed your period from today.', removed)).toBe('Done! I removed your period from today.');
    expect(guardReply('Your next period is likely Oct 21 to Oct 25.', facts)).toBe('Your next period is likely Oct 21 to Oct 25.');
  });
  it('drops diagnosis and a date that is not in the facts', () => {
    expect(guardReply('Done! It might be a sign of infection. Your period is due Oct 3.', facts)).toBe('Done!');
  });
  it.each([
    'You should rest.',
    'Take paracetamol, 500 mg.',
    'Uminom ka ng gamot.',
    'Kailangan mong magpahinga.',
    'That is normal.',
    'It is safe.',
    'Delikado ito.',
    'It could be preeclampsia or anemia.',
    'Try birth control pills.',
    'See https://example.com for more.',
    'You are on day 99.',
  ])('drops "%s"', (text) => expect(guardReply(text, facts)).toBeNull());
  it('lets her own logged symptom be named', () => {
    expect(guardReply('You logged cramps on Oct 9.', facts)).toBe('You logged cramps on Oct 9.');
  });
  it('accepts numbers from the facts', () => {
    expect(guardReply('You are on cycle day 17.', facts)).toBe('You are on cycle day 17.');
  });
  it('returns null for empty text', () => {
    expect(guardReply('', facts)).toBeNull();
  });
});
