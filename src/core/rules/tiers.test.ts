import { describe, expect, it } from 'vitest';
import { applyFollowUpAnswer, runPipeline } from '../pipeline';
import type { Context, Finding } from '../types';
import { evaluate } from './index';

const pregnant: Context = { status: 'pregnant' };
const run = (text: string, context: Context = pregnant) =>
  runPipeline({ id: 't', now: new Date('2026-10-10T05:00:00Z'), text, input: 'text', context });
const finding = (code: string, severity: Finding['severity']): Finding => ({ code: code as Finding['code'], severity, sources: ['lexicon'], confidence: null });

// WHO PCPNC M2, p. 163 (the cards she reads): "Go to the hospital or health centre immediately" versus
// "Go to the health centre as soon as possible".
describe('in pregnancy, the rules follow the two WHO lists', () => {
  it('asks the WHO question for a fever: too weak to get out of bed?', () => {
    const e = run('nilalagnat ako');
    expect(e.decision.level).toBe('follow_up');
    expect(e.decision.follow_up?.question_id).toBe('fu.fever');
  });

  it('fever and too weak to get out of bed: go now', () => {
    expect(applyFollowUpAnswer(run('nilalagnat ako'), 'yes', pregnant).decision.level).toBe('go_now');
  });

  it('fever alone: go to the health centre as soon as possible', () => {
    const e = applyFollowUpAnswer(run('nilalagnat ako'), 'no', pregnant);
    expect(e.decision.level).toBe('go_soon');
    expect(e.decision.fired.map((f) => f.rule_id)).toContain('PCPNC.M2.fever');
  });

  it('a skipped fever question still counts as serious', () => {
    expect(applyFollowUpAnswer(run('nilalagnat ako'), 'skip', pregnant).decision.level).toBe('go_now');
  });

  it('abdominal pain that is not severe: as soon as possible; severe: go now', () => {
    expect(evaluate([finding('severe_abdominal_pain', 'mild')], pregnant).level).toBe('go_soon');
    expect(evaluate([finding('severe_abdominal_pain', 'severe')], pregnant).level).toBe('go_now');
  });

  it('feeling very ill: as soon as possible', () => {
    expect(evaluate([finding('looks_very_ill', 'unknown')], pregnant).level).toBe('go_soon');
  });

  it('the immediate signs stay immediate, with no question', () => {
    expect(run('dumudugo ako').decision.level).toBe('go_now');
    expect(evaluate([finding('convulsions', 'unknown')], pregnant).level).toBe('go_now');
  });

  it('a question still comes before "as soon as possible", since the answer may raise it', () => {
    const d = evaluate([finding('fever', 'mild'), finding('severe_headache', 'unknown')], pregnant);
    expect(d.level).toBe('follow_up');
  });

  it('after birth, fever and feeling very ill keep the go-now rule', () => {
    const postpartum: Context = { status: 'postpartum' };
    expect(evaluate([finding('fever', 'unknown')], postpartum).level).toBe('go_now');
    expect(evaluate([finding('looks_very_ill', 'unknown')], postpartum).level).toBe('go_now');
  });
});
