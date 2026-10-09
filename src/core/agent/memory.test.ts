import { describe, expect, it } from 'vitest';
import { applyMemory, MAX_NOTES, NOTE_CHARS, readMemory, withoutMemory } from './memory';
import { readActions } from './read';
import { triage } from './triage';
import type { AgentAction } from './types';

const TODAY = '2026-10-10';
const remember = (note: string): AgentAction => ({ tool: 'remember', note });

describe('readMemory: remember', () => {
  it.each([
    ['remember that I prefer Taglish', 'I prefer Taglish'],
    ['Please remember I take my walks at 6am', 'I take my walks at 6am'],
    ['please remember that my sister is Ana.', 'my sister is Ana'],
    ['tandaan mo na mas gusto ko ng Tagalog', 'mas gusto ko ng Tagalog'],
    ['Tandaan mo, ayoko ng long replies', 'ayoko ng long replies'],
    ['Liora, remember that my clinic visit is on Fridays', 'my clinic visit is on Fridays'],
  ])('%s', (text, note) => {
    expect(readMemory(text)).toEqual([remember(note)]);
  });

  it('keeps her own words but cuts them at 120 characters', () => {
    const [a] = readMemory(`remember that ${'a'.repeat(300)}`)!;
    expect(a).toMatchObject({ tool: 'remember' });
    expect((a as { note: string }).note).toHaveLength(NOTE_CHARS);
  });

  it.each(['remember', 'remember that', 'do you remember my last period?', 'can you remember when my period is?', 'I remember that I felt tired'])(
    'does not fire on "%s"',
    (text) => expect(readMemory(text)).toBeNull(),
  );

  it('stands alone: it never also logs a symptom or a period', () => {
    expect(readActions('remember that I get headache on mondays', TODAY)).toEqual([remember('I get headache on mondays')]);
  });
});

describe('readMemory: forget', () => {
  it.each([
    ['forget that I prefer Taglish', 'I prefer Taglish'],
    ['kalimutan mo na ang tungkol kay Ana', 'ang tungkol kay Ana'],
    ['Kalimutan mo yung walks ko', 'walks ko'],
  ])('%s', (text, note) => {
    expect(readMemory(text)).toEqual([{ tool: 'forget', note }]);
  });

  it.each(['forget everything', 'forget all of it', 'kalimutan mo lahat'])('"%s" forgets all', (text) => {
    expect(readMemory(text)).toEqual([{ tool: 'forget', all: true }]);
  });

  it('"forget that" alone points at the newest note', () => {
    expect(readMemory('forget that')).toEqual([{ tool: 'forget' }]);
  });

  it('does not fire mid-sentence', () => {
    expect(readMemory("I can't forget the pain")).toBeNull();
  });
});

describe('applyMemory', () => {
  it('adds a note and says so', () => {
    expect(applyMemory([remember('I prefer Taglish')], [])).toEqual({
      notes: ['I prefer Taglish'],
      saved: [{ kind: 'remembered', note: 'I prefer Taglish' }],
    });
  });

  it('ignores a note she already has', () => {
    expect(applyMemory([remember('i prefer taglish')], ['I prefer Taglish'])).toBeNull();
  });

  it('keeps the newest 20 notes', () => {
    const full = Array.from({ length: MAX_NOTES }, (_, i) => `note ${i}`);
    const out = applyMemory([remember('newest')], full)!;
    expect(out.notes).toHaveLength(MAX_NOTES);
    expect(out.notes.at(-1)).toBe('newest');
    expect(out.notes).not.toContain('note 0');
  });

  it('forgets the best text match', () => {
    const notes = ['I prefer Taglish', 'my sister is Ana', 'walks at 6am'];
    expect(applyMemory([{ tool: 'forget', note: 'about Taglish' }], notes)).toEqual({
      notes: ['my sister is Ana', 'walks at 6am'],
      saved: [{ kind: 'forgot', note: 'I prefer Taglish' }],
    });
  });

  it('forgets nothing when no note matches', () => {
    expect(applyMemory([{ tool: 'forget', note: 'zebra' }], ['I prefer Taglish'])).toBeNull();
  });

  it('forgets the newest note when she names none', () => {
    expect(applyMemory([{ tool: 'forget' }], ['a note', 'b note'])?.notes).toEqual(['a note']);
  });

  it('forgets everything', () => {
    expect(applyMemory([{ tool: 'forget', all: true }], ['a', 'b'])).toEqual({ notes: [], saved: [{ kind: 'forgot', note: null }] });
    expect(applyMemory([{ tool: 'forget', all: true }], [])).toBeNull();
  });

  it('is null for actions that are not about memory', () => {
    expect(applyMemory([{ tool: 'smalltalk' }], ['x'])).toBeNull();
  });
});

describe('withoutMemory', () => {
  it('drops remember and forget and keeps the rest', () => {
    expect(withoutMemory([remember('x'), { tool: 'forget' }, { tool: 'smalltalk' }])).toEqual([{ tool: 'smalltalk' }]);
  });
});

describe('triage of a memory request', () => {
  it('is an update and keeps the model danger check on', () => {
    expect(triage('remember that I prefer Taglish', TODAY, 'neither')).toMatchObject({ purpose: 'update', typed: 'all' });
  });

  it('is still urgent when the note names a danger sign', () => {
    expect(triage('remember na dinudugo ako nang malakas', TODAY, 'pregnant').purpose).toBe('urgent');
  });
});
