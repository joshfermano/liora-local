import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CycleSettings, Entry, MoodResult, PeriodRecord } from '../core/types';
import { storage } from './storage';

export type SetupAnswers = Record<string, unknown>;

interface LogData {
  entries: Entry[];
  setup: SetupAnswers | null;
  moods: MoodResult[];
  periods: PeriodRecord[];
  cycleSettings: CycleSettings;
}

export interface LogState extends LogData {
  addEntry(entry: Entry): void;
  deleteEntry(id: string): void;
  setSetup(setup: SetupAnswers): void;
  addMood(result: MoodResult): void;
  setPeriods(periods: PeriodRecord[]): void;
  setCycleSettings(settings: CycleSettings): void;
  deleteEverything(): Promise<void>;
}

const EMPTY: LogData = { entries: [], setup: null, moods: [], periods: [], cycleSettings: {} };

export const useLogStore = create<LogState>()(
  persist(
    (set) => ({
      ...EMPTY,
      addEntry: (entry) =>
        set((s) => ({ entries: [entry, ...s.entries.filter((e) => e.id !== entry.id)] })),
      deleteEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      setSetup: (setup) => set({ setup }),
      addMood: (result) => set((s) => ({ moods: [result, ...s.moods] })),
      setPeriods: (periods) => set({ periods }),
      setCycleSettings: (cycleSettings) => set({ cycleSettings }),
      deleteEverything: async () => {
        set({ ...EMPTY });
        await storage.clear();
      },
    }),
    {
      name: 'tell-liora-log',
      storage: createJSONStorage(() => storage),
      partialize: ({ entries, setup, moods, periods, cycleSettings }) => ({
        entries,
        setup,
        moods,
        periods,
        cycleSettings,
      }),
    },
  ),
);
