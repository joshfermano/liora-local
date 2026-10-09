import { describe, expect, it } from 'vitest';
import { PROVISIONAL_THRESHOLDS, fromTypedDecision, mergeFindings } from './merge';
import type { Finding } from './types';

const f = (over: Partial<Finding>): Finding => ({
  code: 'fever',
  severity: 'mild',
  sources: ['lexicon'],
  confidence: null,
  ...over,
});

describe('mergeFindings', () => {
  it('keeps a danger code found by any single source', () => {
    const out = mergeFindings([f({ code: 'convulsions', sources: ['embedding'] }), f({ code: 'cramps' })]);
    expect(out.map((x) => x.code).sort()).toEqual(['convulsions', 'cramps']);
  });
  it('unions findings by code and unions their sources', () => {
    const out = mergeFindings([f({ sources: ['lexicon'] }), f({ sources: ['llm', 'lexicon'], confidence: 0.7 })]);
    expect(out).toHaveLength(1);
    expect(out[0]?.sources.sort()).toEqual(['lexicon', 'llm']);
    expect(out[0]?.confidence).toBe(0.7);
  });
  it('severe wins over everything', () => {
    expect(mergeFindings([f({ severity: 'severe' }), f({ severity: 'unknown' }), f({ severity: 'mild' })])[0]?.severity).toBe('severe');
  });
  it('unknown beats moderate and mild', () => {
    expect(mergeFindings([f({ severity: 'unknown' }), f({ severity: 'moderate' })])[0]?.severity).toBe('unknown');
  });
  it('takes the more serious of moderate and mild', () => {
    expect(mergeFindings([f({ severity: 'mild' }), f({ severity: 'moderate' })])[0]?.severity).toBe('moderate');
  });
  it('returns an empty list for no findings', () => {
    expect(mergeFindings([])).toEqual([]);
  });
});

describe('fromTypedDecision', () => {
  const t = PROVISIONAL_THRESHOLDS;
  it('exposes the provisional thresholds', () => {
    expect(t).toEqual({ tauLo: 0.2, tauHi: 0.6 });
  });
  it('at or above tauHi gives the scored severity', () => {
    expect(fromTypedDecision('fever', 0.6, 'moderate', t)).toEqual({
      code: 'fever', severity: 'moderate', sources: ['llm'], confidence: 0.6,
    });
  });
  it('at or above tauHi with no score gives unknown', () => {
    expect(fromTypedDecision('fever', 0.9, null, t)?.severity).toBe('unknown');
  });
  it('between the bands gives unknown', () => {
    expect(fromTypedDecision('fever', 0.2, 'severe', t)?.severity).toBe('unknown');
    expect(fromTypedDecision('fever', 0.59, 'severe', t)?.severity).toBe('unknown');
  });
  it('below tauLo gives null', () => {
    expect(fromTypedDecision('fever', 0.19, 'severe', t)).toBeNull();
  });
});
