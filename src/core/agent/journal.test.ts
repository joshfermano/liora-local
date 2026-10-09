import { describe, expect, it } from 'vitest';
import { JOURNAL_SIZE, keepRecent, undoable, type JournalEntry } from './journal';

const entry = (id: string, ...slices: ('periods' | 'dayLogs' | 'setup' | 'notes')[]): JournalEntry => ({
  id,
  at: '2026-10-10T04:00:00.000Z',
  saved: [],
  undo: Object.fromEntries(slices.map((s) => [s, s === 'notes' ? [] : s === 'setup' ? null : []])),
});

describe('keepRecent', () => {
  it('keeps the newest 10 commits', () => {
    const many = Array.from({ length: 12 }, (_, i) => entry(`e${i}`, 'periods'));
    const kept = keepRecent(many);
    expect(kept).toHaveLength(JOURNAL_SIZE);
    expect(kept[0]!.id).toBe('e2');
    expect(kept.at(-1)!.id).toBe('e11');
  });
});

describe('undoable', () => {
  it('finds the newest commit', () => {
    expect(undoable([entry('a', 'periods'), entry('b', 'dayLogs')], 'b')?.id).toBe('b');
  });

  it('is null for an id that is not in the journal', () => {
    expect(undoable([entry('a', 'periods')], 'zzz')).toBeNull();
  });

  it('lets an older commit be undone when nothing newer touched the same data', () => {
    expect(undoable([entry('a', 'periods'), entry('b', 'dayLogs')], 'a')?.id).toBe('a');
  });

  it('refuses an older commit when a newer one changed the same data', () => {
    expect(undoable([entry('a', 'periods'), entry('b', 'periods', 'dayLogs')], 'a')).toBeNull();
    expect(undoable([entry('a', 'notes'), entry('b', 'notes')], 'a')).toBeNull();
  });
});
