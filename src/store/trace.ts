import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Draft } from '../core/probe';
import { onDeleteEverything } from './log';
import { storage } from './storage';

export const TRACE_LIMIT = 50;

// One agent turn, as numbers and names. It never holds her message or Liora's reply.
export interface TurnTrace {
  at: string;
  purpose: string;
  typedScope: string;
  tools: string[];
  cacheHits: string[];
  ms: { triage: number; typed: number; route: number; reply: number; total: number };
  // Sentences of Gemma's reply that the guard removed.
  guardDropped: number;
  // True when a fixed line was shown instead of Gemma's words.
  fallback: boolean;
  promptVersions: Record<string, string>;
}

export function toTrace(draft: Draft, totalMs: number, at = new Date()): TurnTrace {
  return {
    at: at.toISOString(),
    purpose: draft.purpose,
    typedScope: draft.typedScope,
    tools: [...draft.tools],
    cacheHits: [...draft.cacheHits],
    ms: { ...draft.ms, total: totalMs },
    guardDropped: draft.guardDropped,
    fallback: draft.fallback,
    promptVersions: { ...draft.prompts },
  };
}

// Newest first, 50 at most.
export const pushTrace = (list: readonly TurnTrace[], trace: TurnTrace): TurnTrace[] => [trace, ...list].slice(0, TRACE_LIMIT);

interface TraceState {
  traces: TurnTrace[];
  add(trace: TurnTrace): void;
  set(traces: TurnTrace[]): void;
  clear(): void;
}

export const useTraceStore = create<TraceState>()(
  persist(
    (set) => ({
      traces: [],
      add: (trace) => set((s) => ({ traces: pushTrace(s.traces, trace) })),
      set: (traces) => set({ traces: traces.slice(0, TRACE_LIMIT) }),
      clear: () => set({ traces: [] }),
    }),
    {
      name: 'tell-liora-trace',
      storage: createJSONStorage(() => storage),
      partialize: ({ traces }) => ({ traces }),
    },
  ),
);

onDeleteEverything(() => useTraceStore.getState().clear());
