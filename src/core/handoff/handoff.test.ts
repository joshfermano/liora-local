import { describe, expect, it } from 'vitest';
import type { DayLog, Entry, PeriodRecord } from '../types';
import { handoffReport, type HandoffInput } from './index';

const NOW = new Date('2026-10-10T04:30:00.000Z');
const period = (start: string, end: string): PeriodRecord => ({ id: start, start, end, flow_by_day: {}, source: 'calendar' });
const log = (date: string, over: Partial<DayLog>): DayLog => ({ date, flow: null, symptoms: [], moods: [], activities: [], ...over });
const ENTRY = {
  id: 'e1',
  created_at: '2026-10-10T04:20:00.000Z',
  text: 'sobrang sakit ng ulo ko tapos malabo paningin',
  input: 'voice',
  findings: [
    { code: 'visual_disturbance', severity: 'unknown', sources: ['lexicon'], confidence: null },
    { code: 'severe_headache', severity: 'severe', sources: ['lexicon', 'llm'], confidence: 0.9 },
  ],
  extraction: null,
  decision: { level: 'go_now', fired: [{ rule_id: 'ANC.DT.01.headache', codes: ['severe_headache'] }] },
  card_ids: [],
  models: [],
} as unknown as Entry;

const input = (over: Partial<HandoffInput> = {}): HandoffInput => ({
  patient: { name: 'Gweny', age: 22, bloodType: 'O+', heightCm: 157, weightKg: 55, status: 'pregnant', weeks: 32 },
  emergency: { name: 'Ana', relation: 'Sister', phone: '+63 917 123 4567' },
  entry: ENTRY,
  entries: [ENTRY],
  dayLogs: [log('2026-10-09', { symptoms: ['headache'], moods: ['anxious'] }), log('2026-09-20', { symptoms: ['nausea'] })],
  periods: [period('2026-02-20', '2026-02-24')],
  now: NOW,
  ...over,
});

describe('the handoff report for a nurse, BHW or doctor', () => {
  it('lists who she is, her pregnancy and her emergency contact', () => {
    const r = handoffReport(input());
    expect(r.madeAt).toBe(NOW.toISOString());
    expect(r.patient).toEqual({ name: 'Gweny', age: 22, bloodType: 'O+', heightCm: 157, weightKg: 55 });
    expect(r.pregnancy).toEqual({ status: 'pregnant', weeks: 32, lastPeriodStart: '2026-02-20' });
    expect(r.emergency).toEqual({ name: 'Ana', relation: 'Sister', phone: '+63 917 123 4567' });
  });

  it("gives today's concern in her words, danger signs first, with the rule that fired", () => {
    const { concern } = handoffReport(input());
    expect(concern).toMatchObject({ said: ENTRY.text, at: ENTRY.created_at, input: 'voice', level: 'go_now', rules: ['ANC.DT.01.headache'] });
    expect(concern?.signs.map((s) => s.code)).toEqual(['severe_headache', 'visual_disturbance']);
  });

  it('lists the last seven days she logged, newest first, and nothing older', () => {
    const { recent } = handoffReport(input());
    expect(recent.map((d) => d.date)).toEqual(['2026-10-10', '2026-10-09']);
    expect(recent[1]).toEqual({ date: '2026-10-09', flow: null, symptoms: ['headache'], moods: ['anxious'] });
    expect(recent[0]!.symptoms).toEqual(['severe_headache', 'visual_disturbance']);
  });

  it('works without a concern, as a health summary', () => {
    const r = handoffReport(input({ entry: null }));
    expect(r.concern).toBeNull();
    expect(r.patient.name).toBe('Gweny');
  });
});
