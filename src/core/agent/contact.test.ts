import { describe, expect, it } from 'vitest';
import { readActions } from './read';
import { triage } from './triage';
import { replyPlan, type Outcome } from './outcome';

const today = '2026-10-10';

describe('she asks Liora to reach her emergency contact', () => {
  it.each([
    'Can you call him?',
    'Who is my emergency contact?',
    'call my husband',
    'tawagan mo si mama',
    'pa-text naman sa asawa ko',
    'i-text mo yung emergency contact ko',
  ])('%s → the contact tool alone', (text) => {
    expect(readActions(text, today)).toEqual([{ tool: 'contact' }]);
  });

  it.each(['I called my mom yesterday', 'nag-text ako kay ate kanina', 'masakit ulo ko'])('not: %s', (text) => {
    expect(readActions(text, today).some((a) => a.tool === 'contact')).toBe(false);
  });

  it('is a question about her own data, so no danger questions run', () => {
    expect(triage('Can you call him?', today, 'pregnant')).toMatchObject({ purpose: 'ask', typed: 'none' });
  });

  it('tells the reply the buttons are below and that Liora cannot call by herself', () => {
    const o: Outcome = {
      saved: [], waiting: false, undid: null, nothingToUndo: false, notFound: false, cycle: null, day: null,
      card: null, opened: null, smalltalk: null, asksAboutHerData: true, contact: true,
    };
    const { facts, fallback } = replyPlan(o, { tone: 'neutral', today });
    expect(facts.call_and_text_buttons).toBeDefined();
    expect(facts.no_action_taken).toBeUndefined();
    expect(fallback.key).toBe('reply.contact');
  });
});
