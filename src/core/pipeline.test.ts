import { describe, expect, it } from 'vitest';
import { EntrySchema, type Context } from './types';
import { applyFollowUpAnswer, runPipeline } from './pipeline';

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
      text: 'masakit ulo ko',
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
