import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { upsertDayLog } from '../core/daylog';
import type { CycleSettings, DayLog, Entry, MoodResult, PeriodRecord } from '../core/types';
import { storage } from './storage';

export type SetupAnswers = Record<string, unknown>;

interface LogData {
  entries: Entry[];
  setup: SetupAnswers | null;
  moods: MoodResult[];
  periods: PeriodRecord[];
  dayLogs: DayLog[];
  cycleSettings: CycleSettings;
}

export interface LogState extends LogData {
  addEntry(entry: Entry): void;
  deleteEntry(id: string): void;
  setSetup(setup: SetupAnswers): void;
  addMood(result: MoodResult): void;
  setPeriods(periods: PeriodRecord[]): void;
  setDayLogs(dayLogs: DayLog[]): void;
  saveDayLog(log: DayLog, periods?: PeriodRecord[]): void;
  deleteDayLog(date: string): void;
  setCycleSettings(settings: CycleSettings): void;
  deleteEverything(): Promise<void>;
}

const wipes: (() => void)[] = [];
// Other stores register here so "Delete everything" also empties them (memory, journal).
export function onDeleteEverything(fn: () => void): void {
  wipes.push(fn);
}

const EMPTY: LogData = { entries: [], setup: null, moods: [], periods: [], dayLogs: [], cycleSettings: {} };

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
      setDayLogs: (dayLogs) => set({ dayLogs }),
      saveDayLog: (log, periods) =>
        set((s) => ({ dayLogs: upsertDayLog(s.dayLogs, log), periods: periods ?? s.periods })),
      deleteDayLog: (date) => set((s) => ({ dayLogs: s.dayLogs.filter((l) => l.date !== date) })),
      setCycleSettings: (cycleSettings) => set({ cycleSettings }),
      deleteEverything: async () => {
        set({ ...EMPTY });
        for (const wipe of wipes) wipe();
        await storage.clear();
      },
    }),
    {
      name: 'tell-liora-log',
      storage: createJSONStorage(() => storage),
      partialize: ({ entries, setup, moods, periods, dayLogs, cycleSettings }) => ({
        entries,
        setup,
        moods,
        periods,
        dayLogs,
        cycleSettings,
      }),
    },
  ),
);
