import { format } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { composeReply, ruleIntent, type Intent, type ReplyBlock } from '../core/companion';
import { contextFrom, readProfile } from './profile';
import { useLogStore } from './log';
import { storage } from './storage';
import { useTellStore } from './tell';

export interface ThreadMessage {
  id: string;
  role: 'her' | 'liora';
  text?: string;
  blocks?: ReplyBlock[];
  at: string;
}

interface CompanionState {
  messages: ThreadMessage[];
  thinking: boolean;
  send(text: string): Promise<void>;
  clear(): void;
}

type AskIntent = (text: string) => Promise<Intent | null>;
let askIntent: AskIntent | null = null;
const INTENT_TIMEOUT_MS = 3000;

export function setAskIntent(fn: AskIntent | null): void {
  askIntent = fn;
}

// Gemma is asked only when the word rules read nothing; a slow or failed answer keeps 'other'.
async function intentFor(text: string, ruled: Intent): Promise<Intent> {
  if (ruled !== 'other' || !askIntent) return ruled;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), INTENT_TIMEOUT_MS));
  try {
    return (await Promise.race([askIntent(text), timeout])) ?? ruled;
  } catch {
    return ruled;
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useCompanionStore = create<CompanionState>()(
  persist(
    (set, get) => ({
      messages: [],
      thinking: false,
      clear: () => set({ messages: [], thinking: false }),
      send: async (raw) => {
        const text = raw.trim();
        if (!text || get().thinking) return;
        const her: ThreadMessage = { id: newId(), role: 'her', text, at: new Date().toISOString() };
        set((s) => ({ messages: [...s.messages, her], thinking: true }));
        let blocks: ReplyBlock[];
        try {
          const entry = await useTellStore.getState().submit(text);
          const { setup, periods, cycleSettings } = useLogStore.getState();
          const profile = readProfile(setup);
          const intent = await intentFor(text, ruleIntent(text, entry));
          blocks = composeReply({
            intent,
            entry,
            context: contextFrom(profile),
            periods,
            cycleSettings,
            today: format(new Date(), 'yyyy-MM-dd'),
            cardId: entry.card_ids[0] ?? null,
            name: profile.name,
          });
        } catch {
          blocks = [{ kind: 'text', key: 'liora.error' }];
        }
        const liora: ThreadMessage = { id: newId(), role: 'liora', blocks, at: new Date().toISOString() };
        set((s) => ({ messages: [...s.messages, liora], thinking: false }));
      },
    }),
    {
      name: 'tell-liora-thread',
      storage: createJSONStorage(() => storage),
      partialize: ({ messages }) => ({ messages }),
    },
  ),
);

// Delete everything wipes the disk but not memory, so the thread follows the log store down.
useLogStore.subscribe((now, before) => {
  const hadData = before.entries.length > 0 || before.setup !== null || before.periods.length > 0;
  const empty = now.entries.length === 0 && now.setup === null && now.periods.length === 0 && now.moods.length === 0;
  if (hadData && empty) useCompanionStore.getState().clear();
});
