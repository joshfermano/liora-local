import { describe, expect, it } from 'vitest';
import { evaluate, RULES } from './index';
import { FOLLOW_UPS, applyAnswer } from '../followups';
import { DANGER_CODES } from '../vocabulary';
import type { Context, Finding, Severity } from '../types';

const ctx: Context = { status: 'pregnant', weeks: 30 };
const finding = (code: Finding['code'], severity: Severity): Finding => ({
  code, severity, sources: ['lexicon'], confidence: null,
});
const SOURCE = {
  org: 'WHO',
  title: 'WHO antenatal care recommendations for a positive pregnancy experience: digital adaptation kit',
  year: 2021,
  url: 'https://www.who.int/publications/i/item/9789240020306',
};

describe('rule table', () => {
  it('has one DT.01 rule per danger code, each with the WHO source', () => {
    for (const code of DANGER_CODES) {
      const rule = RULES.find((r) => r.codes.length === 1 && r.codes[0] === code);
      expect(rule, code).toBeDefined();
      expect(rule?.level).toBe('go_now');
      expect(rule?.source).toEqual({ ...SOURCE, ref: 'ANC.DT.01' });
    }
    expect(RULES).toHaveLength(15);
  });
  it('DT.17 cites its own ref', () => {
    expect(RULES.find((r) => r.id === 'ANC.DT.17')?.source).toEqual({ ...SOURCE, ref: 'ANC.DT.17' });
  });
});

describe.each(DANGER_CODES.filter((c) => !c.startsWith('severe_')))('ungated rule %s', (code) => {
  it.each(['mild', 'moderate', 'severe', 'unknown'] as const)('fires at %s', (sev) => {
    const d = evaluate([finding(code, sev)], ctx);
    expect(d.level).toBe('go_now');
    expect(d.fired).toEqual([{ rule_id: `ANC.DT.01.${code}`, codes: [code] }]);
  });
  it('does not fire when the code is absent', () => {
    expect(evaluate([finding('cramps', 'severe')], ctx).level).toBe('ok');
  });
});

describe.each(DANGER_CODES.filter((c) => c.startsWith('severe_')))('gated rule %s', (code) => {
  it('fires at severe', () => {
    const d = evaluate([finding(code, 'severe')], ctx);
    expect(d.level).toBe('go_now');
    expect(d.fired[0]?.rule_id).toBe(`ANC.DT.01.${code}`);
  });
  it.each(['mild', 'moderate'] as const)('does not fire at %s', (sev) => {
    expect(evaluate([finding(code, sev)], ctx)).toEqual({ level: 'ok', fired: [] });
  });
  it('asks its follow-up at unknown', () => {
    const d = evaluate([finding(code, 'unknown')], ctx);
    expect(d.level).toBe('follow_up');
    expect(d.follow_up?.code).toBe(code);
    expect(d.fired).toEqual([]);
  });
  it('does not fire when the code is absent', () => {
    expect(evaluate([], ctx).level).toBe('ok');
  });
});

describe('DT.17', () => {
  const bp = (systolic: number, diastolic: number) => ({ systolic, diastolic, recorded_at: '2026-10-09' });
  const fires = (c: Context) => evaluate([], c).fired.some((f) => f.rule_id === 'ANC.DT.17');
  it('fires at systolic 160 with proteinuria', () => {
    const d = evaluate([], { ...ctx, bp: bp(160, 80), proteinuria: true });
    expect(d.level).toBe('go_now');
    expect(d.fired).toEqual([{ rule_id: 'ANC.DT.17', codes: [] }]);
  });
  it('fires at diastolic 110 with proteinuria', () => {
    expect(fires({ ...ctx, bp: bp(120, 110), proteinuria: true })).toBe(true);
  });
  it('does not fire below both thresholds', () => {
    expect(fires({ ...ctx, bp: bp(159, 109), proteinuria: true })).toBe(false);
  });
  it('does not fire without proteinuria', () => {
    expect(fires({ ...ctx, bp: bp(170, 120) })).toBe(false);
    expect(fires({ ...ctx, bp: bp(170, 120), proteinuria: false })).toBe(false);
  });
  it('does not fire without a bp reading', () => {
    expect(fires({ ...ctx, proteinuria: true })).toBe(false);
  });
});

describe('evaluate', () => {
  it('applies the same set for every status', () => {
    for (const status of ['pregnant', 'postpartum', 'neither'] as const) {
      expect(evaluate([finding('convulsions', 'mild')], { status }).level).toBe('go_now');
    }
  });
  it('fires every matching rule', () => {
    const d = evaluate([finding('fever', 'mild'), finding('labour', 'mild')], ctx);
    expect(d.fired.map((f) => f.rule_id).sort()).toEqual(['ANC.DT.01.fever', 'ANC.DT.01.labour']);
  });
  it('asks one follow-up at a time', () => {
    const d = evaluate([finding('severe_pain', 'unknown'), finding('severe_vomiting', 'unknown')], ctx);
    expect(d.level).toBe('follow_up');
    expect(d.follow_up).toEqual(FOLLOW_UPS.find((q) => q.code === 'severe_vomiting'));
  });
  it('go_now wins when another rule already fired', () => {
    const d = evaluate([finding('severe_pain', 'unknown'), finding('fever', 'mild')], ctx);
    expect(d.level).toBe('go_now');
    expect(d.follow_up).toBeUndefined();
  });
  it('returns ok with no findings', () => {
    expect(evaluate([], ctx)).toEqual({ level: 'ok', fired: [] });
  });
});

describe('follow-ups', () => {
  it('has one entry per severity-gated code, with no wording', () => {
    expect(FOLLOW_UPS.map((q) => q.code).sort()).toEqual(
      DANGER_CODES.filter((c) => c.startsWith('severe_')).sort(),
    );
    for (const q of FOLLOW_UPS) expect(Object.keys(q).sort()).toEqual(['code', 'question_id']);
  });
  it('maps answers to severity', () => {
    expect(applyAnswer('yes')).toBe('severe');
    expect(applyAnswer('no')).toBe('mild');
    expect(applyAnswer('skip')).toBe('severe');
  });
  it('a skipped follow-up resolves to a go-now', () => {
    const code = 'severe_headache';
    expect(evaluate([finding(code, applyAnswer('skip'))], ctx).level).toBe('go_now');
    expect(evaluate([finding(code, applyAnswer('no'))], ctx).level).toBe('ok');
  });
});
