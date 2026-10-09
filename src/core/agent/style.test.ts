import { describe, expect, it } from 'vitest';
import { replyPlan, type Outcome } from './outcome';

const calm: Outcome = {
  saved: [], waiting: false, undid: null, nothingToUndo: false, notFound: false, cycle: null, day: null,
  card: null, opened: null, smalltalk: 'greeting', asksAboutHerData: false,
};

describe('the reply follows her moods today', () => {
  it('gives the reply her moods logged today, so it can name them', () => {
    const { facts } = replyPlan(calm, { name: 'Ana', tone: 'neutral', today: '2026-10-10', moods: ['joyful', 'romantic'] });
    expect(facts.her_moods_today).toEqual(['joyful', 'romantic']);
  });

  it('picks a bright or gentle fixed line to match, and the plain one otherwise', () => {
    const who = { name: 'Ana', tone: 'neutral' as const, today: '2026-10-10' };
    expect(replyPlan(calm, { ...who, moods: ['joyful'] }).fallback.key).toBe('reply.greeting.bright');
    expect(replyPlan(calm, { ...who, moods: ['anxious', 'joyful'] }).fallback.key).toBe('reply.greeting.gentle');
    expect(replyPlan(calm, who).fallback.key).toBe('reply.greeting');
  });

  it('keeps fixed lines that report a fact as they are', () => {
    const undone: Outcome = { ...calm, smalltalk: null, nothingToUndo: true };
    expect(replyPlan(undone, { tone: 'neutral', today: '2026-10-10', moods: ['sad'] }).fallback.key).toBe('reply.nothing_to_undo');
  });
});

describe('the moods in her message come first', () => {
  it('is bright when she says she is happy now, even after a tired morning', () => {
    const { fallback } = replyPlan(calm, { name: 'Ana', tone: 'neutral', today: '2026-10-10', moods: ['tired', 'joyful', 'romantic'], said: ['joyful', 'romantic'] });
    expect(fallback.key).toBe('reply.greeting.bright');
  });
});

describe('what she says now beats what she logged earlier today', () => {
  const who = { name: 'Ana', today: '2026-10-10', moods: ['joyful' as const, 'romantic' as const] };
  const saved: Outcome = { ...calm, smalltalk: null, saved: [{ kind: 'symptoms', date: '2026-10-10', values: ['headache'] }] };

  it('is gentle when this message reports a symptom, even on a happy day', () => {
    expect(replyPlan(saved, { ...who, tone: 'neutral', hurting: true }).fallback.key).toBe('reply.saved.gentle');
  });

  it('is gentle when this message sounds sad, even on a happy day', () => {
    expect(replyPlan(calm, { ...who, tone: 'sad' }).fallback.key).toBe('reply.greeting.gentle');
  });

  it("uses the day's moods only when this message carries nothing", () => {
    expect(replyPlan(calm, { ...who, tone: 'neutral' }).fallback.key).toBe('reply.greeting.bright');
  });
});
