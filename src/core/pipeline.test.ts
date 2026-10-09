import { describe, expect, it } from 'vitest';
import { EntrySchema, type Context, type Finding } from './types';
import { applyFollowUpAnswer, dangerRulesApply, reopenFollowUp, runPipeline } from './pipeline';

const context: Context = { status: 'pregnant' };
const now = new Date('2026-10-09T14:00:00.000Z');
const base = { id: 'e1', now, input: 'text' as const, context };

describe('runPipeline', () => {
  it('returns a valid entry with the lexicon findings and the evaluated decision', () => {
    const entry = runPipeline({ ...base, text: 'masakit ulo ko' });
    expect(EntrySchema.safeParse(entry).success).toBe(true);
    expect(entry.id).toBe('e1');
    expect(entry.created_at).toBe(now.toISOString());
    expect(entry.text).toBe('masakit ulo ko');
    expect(entry.findings.map((f) => f.code)).toContain('severe_headache');
    expect(entry.decision.level).toBe('follow_up');
    expect(entry.decision.follow_up?.code).toBe('severe_headache');
    expect(entry.card_ids).toEqual([]);
    expect(entry.models).toEqual([]);
  });

  it('merges typed answers with the lexicon and keeps the more serious severity', () => {
    const entry = runPipeline({
      ...base,
      text: 'grabe ang sakit ng ulo ko',
      typedAnswers: { 'yesno.severe_headache': [0.9], 'severe.severe_headache': [0.9], 'mild.severe_headache': [0.05] },
    });
    const headache = entry.findings.filter((f) => f.code === 'severe_headache');
    expect(headache).toHaveLength(1);
    expect(headache[0]?.severity).toBe('severe');
    expect(headache[0]?.sources).toEqual(expect.arrayContaining(['lexicon', 'llm']));
    expect(entry.decision.level).toBe('go_now');
  });

  it('works with the lexicon alone when there are no typed answers', () => {
    const entry = runPipeline({ ...base, text: 'wala naman, okay lang ako' });
    expect(entry.findings).toEqual([]);
    expect(entry.decision.level).toBe('ok');
  });

  it('puts the weeks she wrote into the extraction, and is null otherwise', () => {
    expect(runPipeline({ ...base, text: '32 weeks na ako' }).extraction?.pregnancy_weeks).toBe(32);
    expect(runPipeline({ ...base, text: 'masakit ulo ko' }).extraction).toBeNull();
  });

  it('keeps the input kind', () => {
    expect(runPipeline({ ...base, input: 'voice', text: 'hi' }).input).toBe('voice');
  });
});

describe('applyFollowUpAnswer', () => {
  const pending = () => runPipeline({ ...base, text: 'masakit ulo ko' });

  it('yes makes the pending sign severe and goes now', () => {
    const next = applyFollowUpAnswer(pending(), 'yes', context);
    expect(next.findings.find((f) => f.code === 'severe_headache')?.severity).toBe('severe');
    expect(next.decision.level).toBe('go_now');
  });

  it('skip resolves to serious (SR-5)', () => {
    expect(applyFollowUpAnswer(pending(), 'skip', context).decision.level).toBe('go_now');
  });

  it('records which question she answered and how, so a skip can be shown as a skip', () => {
    expect(applyFollowUpAnswer(pending(), 'skip', context).follow_up_answer).toMatchObject({ code: 'severe_headache', answer: 'skip' });
    expect(applyFollowUpAnswer(pending(), 'yes', context).follow_up_answer).toMatchObject({ code: 'severe_headache', answer: 'yes' });
  });

  it('re-opens a skipped question so she can answer it after all', () => {
    const skipped = applyFollowUpAnswer(pending(), 'skip', context);
    const again = reopenFollowUp(skipped, context);
    expect(again.decision.level).toBe('follow_up');
    expect(again.decision.follow_up?.code).toBe('severe_headache');
    expect(again.follow_up_answer).toBeUndefined();
    expect(applyFollowUpAnswer(again, 'no', context).decision.level).toBe('ok');
  });

  it('leaves an answered yes as it is: only a skip can be re-opened', () => {
    const yes = applyFollowUpAnswer(pending(), 'yes', context);
    expect(reopenFollowUp(yes, context)).toEqual(yes);
  });

  it('no makes it mild and the decision is no longer pending', () => {
    const next = applyFollowUpAnswer(pending(), 'no', context);
    expect(next.findings.find((f) => f.code === 'severe_headache')?.severity).toBe('mild');
    expect(next.decision.level).toBe('ok');
  });

  it('does not change the original entry', () => {
    const before = pending();
    const copy = structuredClone(before);
    applyFollowUpAnswer(before, 'yes', context);
    expect(before).toEqual(copy);
  });

  it('returns the entry unchanged when nothing is pending', () => {
    const ok = runPipeline({ ...base, text: 'okay lang' });
    expect(applyFollowUpAnswer(ok, 'yes', context)).toEqual(ok);
  });
});

describe('the model can add caution but never remove a follow-up on its own (SR-1)', () => {
  const headacheMild = { 'yesno.severe_headache': [0.99, 0.01], 'severe.severe_headache': [0.01, 0.99], 'mild.severe_headache': [0.9, 0.1] };
  const run = (text: string, typedAnswers: Record<string, number[]>) =>
    runPipeline({ id: 'e', now: new Date('2026-10-10T00:00:00Z'), text, input: 'text', context: { status: 'pregnant' }, typedAnswers });

  it("asks the follow-up when only the model calls a severity sign mild and her words don't", () => {
    const entry = run('ang ulo ko', headacheMild);
    expect(entry.findings.find((f) => f.code === 'severe_headache')?.severity).toBe('unknown');
    expect(entry.decision.level).toBe('follow_up');
  });

  it('keeps the mild reading when her own words carry a mild word from the word list', () => {
    const entry = run('konting sakit lang ng ulo ko', headacheMild);
    expect(entry.findings.find((f) => f.code === 'severe_headache')?.severity).toBe('moderate');
    expect(entry.decision.level).toBe('ok');
  });

  it('ignores the mild reading when her words also carry a strong word', () => {
    const entry = run('medyo ang ulo ko pero sobrang hirap', headacheMild);
    expect(entry.findings.find((f) => f.code === 'severe_headache')?.severity).toBe('unknown');
  });
});

describe('comfort first: the model alone cannot call a sign very bad', () => {
  const headacheSevere = { 'yesno.severe_headache': [0.95], 'severe.severe_headache': [0.9], 'mild.severe_headache': [0.05] };
  const run = (text: string) =>
    runPipeline({ id: 'e', now: new Date('2026-10-10T00:00:00Z'), text, input: 'text', context: { status: 'pregnant' }, typedAnswers: headacheSevere });

  it('asks how bad it is first when only the model reads it as very bad', () => {
    const entry = run('log my symptoms today, im having headache and bloating');
    expect(entry.findings.find((f) => f.code === 'severe_headache')?.severity).toBe('unknown');
    expect(entry.decision.level).toBe('follow_up');
    expect(entry.decision.follow_up?.code).toBe('severe_headache');
  });

  it.each([
    'sobrang sakit ng ulo ko',
    'hindi ko na kaya ang sakit ng ulo ko',
    'di ko na kaya yung ulo ko',
    'i have a very bad headache',
    'worst headache of my life',
    'my headache is unbearable',
  ])('goes now when her own words say it is very bad: %s', (text) => {
    expect(run(text).decision.level).toBe('go_now');
  });
});

describe('period mentions', () => {
  it('puts a period she mentions on the entry for the calendar to confirm', () => {
    const entry = runPipeline({ id: 'p', now: new Date('2026-10-09T15:00:00+08:00'), text: 'Nagsimula regla ko kahapon', input: 'text', context: { status: 'neither' } });
    expect(entry.extraction?.period).toMatchObject({ event: 'started', date: '2026-10-08' });
  });
});

describe('the WHO danger-sign rules cover pregnancy and the weeks after birth', () => {
  const run = (status: Context['status'], input: 'text' | 'checklist' = 'text') =>
    runPipeline({ id: 'x', now: new Date('2026-10-10T04:00:00Z'), text: 'sobrang sakit ng ulo ko tapos malabo paningin', input, context: { status } });

  it('decide for a pregnant woman and a new mother', () => {
    expect(run('pregnant').decision.level).toBe('go_now');
    expect(run('postpartum').decision.level).toBe('go_now');
  });

  it('only log her symptoms when she said she is not pregnant', () => {
    const entry = run('neither');
    expect(entry.decision).toEqual({ level: 'ok', fired: [] });
    expect(entry.findings.length).toBeGreaterThan(0);
  });

  it('decide when her message says she is pregnant, whatever her profile says', () => {
    const entry = runPipeline({ id: 'x', now: new Date('2026-10-10T04:00:00Z'), text: '32 weeks na ako, sobrang sakit ng ulo ko tapos malabo paningin', input: 'text', context: { status: 'neither' } });
    expect(entry.decision.level).toBe('go_now');
  });

  it('still decide when she opens the danger-sign checklist herself', () => {
    expect(run('neither', 'checklist').decision.level).toBe('go_now');
  });

  it.each([
    'kapapanganak ko lang, dumudugo',
    'kakapanganak ko lang at sobrang dugo',
    'malapit na akong manganak',
    'gave birth 3 days ago, heavy bleeding',
    'giving birth soon and bleeding',
    'may contractions na',
    'humihilab ang tiyan ko, dumudugo',
    'my newborn is 5 days old and i am bleeding',
    'postpartum bleeding',
    'c-section ko masakit',
    'nakunan ako, dumudugo',
    'miscarriage and bleeding',
    '8 months na ako, dumudugo',
  ])('decide when her words are about birth, whatever her profile says: %s', (text) => {
    expect(dangerRulesApply({ status: 'neither' }, 'text', text)).toBe(true);
  });

  it.each(['nagdudugo ako nang grabe', 'kakapanganak ko lang at sobrang dugo', 'ang daming dugo'])(
    'reads bleeding in her words for a pregnant woman: %s',
    (text) => {
      const entry = runPipeline({ id: 'x', now: new Date('2026-10-10T04:00:00Z'), text, input: 'text', context: { status: 'pregnant' } });
      expect(entry.decision.level).toBe('go_now');
    },
  );
});

describe('one answer for questions she hears as the same', () => {
  const pending = (code: Finding['code']): Finding => ({ code, severity: 'unknown', sources: ['llm'], confidence: 0.9 });

  it('answers every pain sign with one "no" to "Sobrang sakit ba?"', () => {
    const entry = runPipeline({ id: 'p', now, text: 'Masakit ulo ko', input: 'text', context });
    const twoPains = { ...entry, findings: [...entry.findings, pending('severe_pain')] };
    const asked = { ...twoPains, decision: { level: 'follow_up' as const, fired: [], follow_up: { question_id: 'fu.severe_headache', code: 'severe_headache' } } };
    const after = applyFollowUpAnswer(asked, 'no', context);
    expect(after.decision.level).toBe('ok');
    expect(after.findings.filter((f) => f.code.startsWith('severe_')).map((f) => f.severity)).toEqual(['mild', 'mild']);
  });

  it('still asks a different question separately', () => {
    const entry = runPipeline({ id: 'v', now, text: 'Masakit ulo ko', input: 'text', context });
    const asked = { ...entry, findings: [...entry.findings, pending('severe_vomiting')] };
    const after = applyFollowUpAnswer(asked, 'no', context);
    expect(after.decision.level).toBe('follow_up');
    expect(after.decision.follow_up?.code).toBe('severe_vomiting');
  });
});

