import { describe, expect, it } from 'vitest';
import type { Outcome } from './outcome';
import { stepsOf } from './steps';

const calm: Outcome = {
  saved: [],
  waiting: false,
  undid: null,
  nothingToUndo: false,
  notFound: false,
  cycle: null,
  day: null,
  card: null,
  opened: null,
  smalltalk: null,
  asksAboutHerData: false,
};

describe('the steps Liora took in a turn', () => {
  it('lists nothing when she only chatted', () => {
    expect(stepsOf({ ...calm, smalltalk: 'greeting' })).toEqual([]);
    expect(stepsOf(calm)).toEqual([]);
  });

  it('reads her message, then lists each thing it did in order', () => {
    const steps = stepsOf({
      ...calm,
      saved: [{ kind: 'symptoms', date: '2026-10-10', values: ['headache'] }],
      waiting: true,
      card: true,
    });
    expect(steps.map((s) => s.kind)).toEqual(['read', 'saved', 'asked', 'sources']);
  });

  it('records what it looked for and did not find', () => {
    expect(stepsOf({ ...calm, notFound: true }).map((s) => s.kind)).toEqual(['read', 'not_found']);
    expect(stepsOf({ ...calm, card: false })).toContainEqual({ kind: 'sources', found: false });
  });

  it('lists undo, a day lookup, a cycle check, the contact buttons and a shortcut', () => {
    const steps = stepsOf({
      ...calm,
      undid: [{ kind: 'moods', date: '2026-10-10', values: ['sad'] }],
      day: { date: '2026-10-09', facts: {}, hasData: true },
      cycle: { facts: {}, textKey: null },
      contact: true,
      opened: 'calendar',
    });
    expect(steps.map((s) => s.kind)).toEqual(['read', 'undid', 'day', 'cycle', 'contact', 'opened']);
  });
});
