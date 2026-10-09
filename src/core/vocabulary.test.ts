import { describe, expect, it } from 'vitest';
import { DANGER_CODES, FLOWS, MOODS, SYMPTOMS } from './vocabulary';
import { ContextSchema, FindingSchema, PeriodRecordSchema } from './types';

describe('vocabulary', () => {
  it('lists the section 6 ids exactly', () => {
    expect(FLOWS).toEqual(['spotting', 'light', 'medium', 'heavy']);
    expect(SYMPTOMS).toEqual([
      'cramps', 'headache', 'back_pain', 'bloating', 'fatigue', 'mood_changes', 'acne',
      'breast_tenderness', 'sleep_quality', 'energy', 'stress', 'appetite', 'nausea', 'pelvic_pain',
    ]);
    expect(MOODS).toEqual([
      'calm', 'joyful', 'energetic', 'romantic', 'tired', 'anxious', 'stressed', 'irritable', 'sad',
    ]);
    expect(DANGER_CODES).toEqual([
      'vaginal_bleeding', 'convulsions', 'fever', 'severe_headache', 'visual_disturbance',
      'imminent_delivery', 'labour', 'looks_very_ill', 'severe_vomiting', 'severe_pain',
      'severe_abdominal_pain', 'unconscious', 'central_cyanosis',
    ]);
  });
});

describe('schemas', () => {
  it('accepts a finding with null confidence', () => {
    const f = { code: 'fever', severity: 'unknown', sources: ['lexicon'], confidence: null };
    expect(FindingSchema.parse(f)).toEqual(f);
  });
  it('rejects an unknown code', () => {
    expect(
      FindingSchema.safeParse({ code: 'made_up', severity: 'mild', sources: [], confidence: 0.5 }).success,
    ).toBe(false);
  });
  it('rejects confidence outside 0..1', () => {
    expect(
      FindingSchema.safeParse({ code: 'fever', severity: 'mild', sources: [], confidence: 1.5 }).success,
    ).toBe(false);
  });
  it('validates context', () => {
    expect(ContextSchema.safeParse({ status: 'pregnant', weeks: 30 }).success).toBe(true);
    expect(ContextSchema.safeParse({ status: 'other' }).success).toBe(false);
  });
  it('validates period records', () => {
    const ok = { id: 'a', start: '2026-07-01', end: null, flow_by_day: { '2026-07-01': 'light' }, source: 'tell' };
    expect(PeriodRecordSchema.safeParse(ok).success).toBe(true);
    expect(PeriodRecordSchema.safeParse({ ...ok, start: 'July 1' }).success).toBe(false);
  });
});
