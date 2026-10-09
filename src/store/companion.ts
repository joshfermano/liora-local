import { format } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toneOf, type AgentAction, type SavedItem, type Tone } from '../core/agent';
import { composeReply, ruleIntent, type Intent, type ReplyBlock } from '../core/companion';
import { commit, plan, revert, understand, warm } from './agent';
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
  send(text: string, input?: 'text' | 'voice'): Promise<void>;
  // Puts back what a `logged` block saved. False when it is too late (the app was restarted).
  undo(undoId: string): boolean;
  // Her tap on a `confirm` block: yes saves those actions, no drops them.
  confirm(confirmId: string, yes: boolean): void;
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

const STREAM_EVERY_MS = 120;
// One model, one job at a time: the next message waits for a warm line still being written.
let warming: Promise<unknown> = Promise.resolve();

// Her own periods and moods are already saved and shown by the agent's blocks.
const SAVED_ALREADY = /^companion\.(?:period|mood)\./;
const repeatsSaved = (b: ReplyBlock) =>
  b.kind === 'period_confirm' || b.kind === 'mood_noted' || (b.kind === 'text' && SAVED_ALREADY.test(b.key));

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const today = () => format(new Date(), 'yyyy-MM-dd');

function dropBlock(messages: ThreadMessage[], gone: (b: ReplyBlock) => boolean): ThreadMessage[] {
  return messages.map((m) => (m.blocks?.some(gone) ? { ...m, blocks: m.blocks.filter((b) => !gone(b)) } : m));
}

interface AgentTurn {
  saved: SavedItem[];
  logged: Extract<ReplyBlock, { kind: 'logged' }> | null;
  confirm: AgentAction[];
  intent: Intent | null;
}

// Clear logs are saved at once; what needs her yes waits in a confirm block.
async function runAgent(text: string, ruled: Intent, day: string): Promise<AgentTurn | null> {
  try {
    const { actions, intent } = await understand(text, ruled, day);
    const { apply, confirm } = plan(actions, day);
    const done = commit(apply, day);
    return {
      saved: done?.saved ?? [],
      logged: done ? { kind: 'logged', items: done.saved, undoId: done.undoId } : null,
      confirm,
      intent,
    };
  } catch {
    return null;
  }
}

type Set = (fn: (s: CompanionState) => Partial<CompanionState>) => void;

// Fills the warm block as tokens arrive. The guarded final line replaces it; a rejected or missing one
// leaves null, and the screen shows the fixed line for the tone.
async function writeWarm(id: string, line: { text: string; tone: Tone; saved: SavedItem[]; name?: string }, set: Set) {
  const put = (value: string | null) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id
          ? { ...m, blocks: m.blocks?.map((b) => (b.kind === 'warm' ? { ...b, text: value } : b)) }
          : m,
      ),
    }));
  let last = 0;
  const final = await warm(line.text, line.tone, { name: line.name, saved: line.saved }, (partial) => {
    const now = Date.now();
    if (now - last < STREAM_EVERY_MS) return;
    last = now;
    put(partial);
  });
  put(final);
}

export const useCompanionStore = create<CompanionState>()(
  persist(
    (set, get) => ({
      messages: [],
      thinking: false,
      clear: () => set({ messages: [], thinking: false }),
      undo: (undoId) => {
        if (!revert(undoId)) return false;
        set((s) => ({ messages: dropBlock(s.messages, (b) => b.kind === 'logged' && b.undoId === undoId) }));
        return true;
      },
      confirm: (confirmId, yes) => {
        const block = get()
          .messages.flatMap((m) => m.blocks ?? [])
          .find((b) => b.kind === 'confirm' && b.confirmId === confirmId);
        if (block?.kind !== 'confirm') return;
        const done = yes ? commit(block.actions, today()) : null;
        set((s) => ({
          messages: s.messages.map((m) =>
            m.blocks?.some((b) => b.kind === 'confirm' && b.confirmId === confirmId)
              ? {
                  ...m,
                  blocks: [
                    ...m.blocks.filter((b) => !(b.kind === 'confirm' && b.confirmId === confirmId)),
                    ...(done ? [{ kind: 'logged' as const, items: done.saved, undoId: done.undoId }] : []),
                  ],
                }
              : m,
          ),
        }));
      },
      send: async (raw, input = 'text') => {
        const text = raw.trim();
        if (!text || get().thinking) return;
        const her: ThreadMessage = { id: newId(), role: 'her', text, at: new Date().toISOString() };
        set((s) => ({ messages: [...s.messages, her], thinking: true }));
        await warming;
        let blocks: ReplyBlock[];
        let streamFor: { text: string; tone: Tone; saved: SavedItem[]; name?: string } | null = null;
        try {
          const entry = await useTellStore.getState().submit(text, input);
          const { setup, cycleSettings } = useLogStore.getState();
          const profile = readProfile(setup);
          const day = today();
          const level = entry.decision.level;
          const urgent = level === 'go_now' || level === 'follow_up';
          const ruled = ruleIntent(text, entry);
          const agent = urgent ? null : await runAgent(text, ruled, day);
          const intent = agent?.intent ?? (await intentFor(text, ruled));
          const reply = composeReply({
            intent,
            entry,
            context: contextFrom(profile),
            periods: useLogStore.getState().periods,
            cycleSettings,
            today: day,
            cardId: entry.card_ids[0] ?? null,
            name: profile.name,
          });
          if (agent) {
            const tone = toneOf(text, entry);
            const touched = agent.saved.length > 0 || agent.confirm.length > 0;
            blocks = [
              { kind: 'warm', text: null, tone },
              ...(agent.logged ? [agent.logged] : []),
              ...(agent.confirm.length > 0 ? [{ kind: 'confirm' as const, actions: agent.confirm, confirmId: newId() }] : []),
              ...(touched ? reply.filter((b) => !repeatsSaved(b)) : reply),
            ];
            streamFor = { text, tone, saved: agent.saved, name: profile.name };
          } else {
            blocks = reply;
          }
        } catch {
          blocks = [{ kind: 'text', key: 'liora.error' }];
        }
        const liora: ThreadMessage = { id: newId(), role: 'liora', blocks, at: new Date().toISOString() };
        set((s) => ({ messages: [...s.messages, liora], thinking: false }));
        const line = streamFor;
        if (line) warming = writeWarm(liora.id, line, set);
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
