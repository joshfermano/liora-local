import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MAX_NOTES, type Language } from '../core/agent';
import { onDeleteEverything } from './log';
import { storage } from './storage';

interface MemoryState {
  // Her own words, newest last. Used to flavour replies; never read by the rules or triage.
  notes: string[];
  // The language she writes in, from her last messages.
  language?: Language;
  setNotes(notes: string[]): void;
  // The Profile screen's per-note delete.
  forgetAt(index: number): void;
  setLanguage(language: Language): void;
  clear(): void;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set) => ({
      notes: [],
      language: undefined,
      setNotes: (notes) => set({ notes: notes.slice(-MAX_NOTES) }),
      forgetAt: (index) => set((s) => ({ notes: s.notes.filter((_, i) => i !== index) })),
      setLanguage: (language) => set({ language }),
      clear: () => set({ notes: [], language: undefined }),
    }),
    {
      name: 'tell-liora-memory',
      storage: createJSONStorage(() => storage),
      partialize: ({ notes, language }) => ({ notes, language }),
    },
  ),
);

onDeleteEverything(() => useMemoryStore.getState().clear());
