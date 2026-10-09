import type { SavedItem, Undo } from './types';

// One change Liora made for her, with the slices as they were so Undo can put them back.
export interface JournalEntry {
  id: string;
  at: string;
  saved: SavedItem[];
  undo: Undo;
}

export const JOURNAL_SIZE = 10;

export const keepRecent = (entries: JournalEntry[]): JournalEntry[] => entries.slice(-JOURNAL_SIZE);

// An older change can be undone only if no newer one touched the same data; otherwise putting its
// snapshot back would erase the newer work.
export function undoable(entries: JournalEntry[], id: string): JournalEntry | null {
  const at = entries.findIndex((e) => e.id === id);
  if (at < 0) return null;
  const mine = Object.keys(entries[at]!.undo);
  const clash = entries.slice(at + 1).some((e) => Object.keys(e.undo).some((k) => mine.includes(k)));
  return clash ? null : entries[at]!;
}
