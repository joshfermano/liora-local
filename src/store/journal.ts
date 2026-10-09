import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { keepRecent, type JournalEntry } from '../core/agent';
import { onDeleteEverything } from './log';
import { storage } from './storage';

interface JournalState {
  // Oldest first; only the last 10 commits are kept.
  entries: JournalEntry[];
  record(entry: JournalEntry): void;
  drop(id: string): void;
  clear(): void;
}

// What Liora changed for her, kept on the phone so Undo still works after the app restarts.
export const useJournalStore = create<JournalState>()(
  persist(
    (set) => ({
      entries: [],
      record: (entry) => set((s) => ({ entries: keepRecent([...s.entries, entry]) })),
      drop: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'tell-liora-journal',
      storage: createJSONStorage(() => storage),
      partialize: ({ entries }) => ({ entries }),
    },
  ),
);

onDeleteEverything(() => useJournalStore.getState().clear());
