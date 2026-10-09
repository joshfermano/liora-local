import { format } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { languageOf, triage } from '../core/agent';
import { composeReply, ruleIntent, type ReplyBlock } from '../core/companion';
import { beginProbe, endProbe, noteTurn, timedSync } from '../core/probe';
import { canSay, commit, revert, say } from './agent';
import { contextFrom, readProfile } from './profile';
import { useMemoryStore } from './memory';
import { useLogStore } from './log';
import { storage } from './storage';
import { useTellStore } from './tell';
import { toTrace, useTraceStore } from './trace';
import { recentTurns } from './thread';
import { runTurn, type AgentTurn } from './turn';

export interface ThreadMessage {
  id: string;
  role: 'her' | 'liora';
  text?: string;
  blocks?: ReplyBlock[];
  at: string;
}

// A conversation she cleared, kept on this phone so she can read it again.
export interface PastChat {
  id: string;
  startedAt: string;
  endedAt: string;
  messages: ThreadMessage[];
}

const HISTORY_MAX = 50;

// Only a conversation with her own words is worth keeping.
function archived(messages: ThreadMessage[], history: PastChat[]): PastChat[] {
  if (!messages.some((m) => m.role === 'her')) return history;
  // An unanswered save question is dropped: a yes tapped days later would save stale data.
  const kept = dropBlock(messages, (b) => b.kind === 'confirm');
  const chat: PastChat = { id: newId(), startedAt: messages[0]!.at, endedAt: messages[messages.length - 1]!.at, messages: kept };
  return [chat, ...history].slice(0, HISTORY_MAX);
}

interface CompanionState {
  messages: ThreadMessage[];
  history: PastChat[];
  thinking: boolean;
  send(text: string, input?: 'text' | 'voice'): Promise<void>;
  // Puts back what a `logged` block saved. False when a newer change has since touched the same data
  // or the change has left the journal (the last 10 are kept, across restarts).
  undo(undoId: string): boolean;
  // Her tap on a `confirm` block: yes saves those actions, no drops them.
  confirm(confirmId: string, yes: boolean): void;
  // Starts a fresh conversation; the one she leaves goes to history.
  clear(): void;
  // Brings a past conversation back; the current one goes to history.
  open(id: string): void;
  forget(id: string): void;
  // Delete everything: the thread and all of history.
  wipe(): void;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const today = () => format(new Date(), 'yyyy-MM-dd');
// Plain tests have no __DEV__; the logs are for the phone's dev server only.
const dev = typeof __DEV__ !== 'undefined' && __DEV__;
const REPLY_DEADLINE_MS = 25000;

function dropBlock(messages: ThreadMessage[], gone: (b: ReplyBlock) => boolean): ThreadMessage[] {
  return messages.map((m) => (m.blocks?.some(gone) ? { ...m, blocks: m.blocks.filter((b) => !gone(b)) } : m));
}

type Set = (fn: (s: CompanionState) => Partial<CompanionState>) => void;

// Only text that already passed guardReply is ever put here; the screen shows the fixed fallback while it is null.
function putReply(set: Set, id: string, text: string | null) {
  set((s) => ({
    messages: s.messages.map((m) =>
      m.id === id ? { ...m, blocks: m.blocks?.map((b) => (b.kind === 'reply' ? { ...b, text } : b)) } : m,
    ),
  }));
}

export const useCompanionStore = create<CompanionState>()(
  persist(
    (set, get) => ({
      messages: [],
      thinking: false,
      history: [],
      clear: () => set((s) => ({ messages: [], thinking: false, history: archived(s.messages, s.history) })),
      open: (id) =>
        set((s) => {
          const chat = s.history.find((c) => c.id === id);
          if (!chat) return {};
          return { messages: chat.messages, thinking: false, history: archived(s.messages, s.history.filter((c) => c.id !== id)) };
        }),
      forget: (id) => set((s) => ({ history: s.history.filter((c) => c.id !== id) })),
      wipe: () => set({ messages: [], history: [], thinking: false }),
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
        const thread = recentTurns(get().messages);
        const her: ThreadMessage = { id: newId(), role: 'her', text, at: new Date().toISOString() };
        set((s) => ({ messages: [...s.messages, her], thinking: true }));
        useMemoryStore.getState().setLanguage(languageOf(get().messages.filter((m) => m.role === 'her').map((m) => m.text ?? '')));
        const t0 = Date.now();
        beginProbe();
        const mark = (stage: string) => {
          if (dev) console.log(`[chat] ${stage} at ${Date.now() - t0} ms`);
        };
        let added = false;
        const add = (blocks: ReplyBlock[]): string => {
          const liora: ThreadMessage = { id: newId(), role: 'liora', blocks, at: new Date().toISOString() };
          added = true;
          set((s) => ({ messages: [...s.messages, liora] }));
          return liora.id;
        };
        const work = async () => {
          const entry = await useTellStore.getState().submit(text, input);
          mark(`rules decided ${entry.decision.level}${entry.decision.follow_up ? ` (asks ${entry.decision.follow_up.question_id})` : ''}`);
          const { setup, cycleSettings } = useLogStore.getState();
          const profile = readProfile(setup);
          const day = today();
          const read = timedSync('triage', () => triage(text, day, profile.status));
          noteTurn({ purpose: read.purpose, typedScope: read.typed, tools: read.actions.map((a) => a.tool) });
          // A danger turn gets the rules' fixed decision block and no model-written words.
          const urgent = entry.decision.level === 'go_now' || entry.decision.level === 'follow_up' || read.purpose === 'urgent';
          let turn: AgentTurn | null = null;
          if (!urgent) {
            try {
              turn = await runTurn(text, entry, day, thread, read);
            } catch {
              turn = null;
            }
          }
          mark('tools done');
          if (!turn) {
            add(
              composeReply({
                intent: ruleIntent(text, entry),
                entry,
                context: contextFrom(profile),
                periods: useLogStore.getState().periods,
                cycleSettings,
                today: day,
                cardId: entry.card_ids[0] ?? null,
                name: profile.name,
              }),
            );
            return;
          }
          const id = add([{ kind: 'reply', text: null, fallback: turn.fallback }, ...turn.attachments]);
          const undone = turn.undoneId;
          if (undone) set((s) => ({ messages: dropBlock(s.messages, (b) => b.kind === 'logged' && b.undoId === undone) }));
          if (canSay()) {
            const final = await say(turn.request, (guarded) => putReply(set, id, guarded));
            putReply(set, id, final);
            noteTurn({ fallback: final === null });
          }
        };
        let timer: ReturnType<typeof setTimeout> | undefined;
        // A model call that never returns must not leave her thread stuck on 'thinking'.
        const deadline = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('reply took too long')), REPLY_DEADLINE_MS);
        });
        try {
          await Promise.race([work(), deadline]);
        } catch (e) {
          if (dev) console.warn(`[chat] no reply: ${e instanceof Error ? e.message : String(e)}`);
          if (!added) add([{ kind: 'text', key: 'liora.error' }]);
        } finally {
          clearTimeout(timer);
          const draft = endProbe();
          if (draft) useTraceStore.getState().add(toTrace(draft, Date.now() - t0));
          mark('replied');
          set(() => ({ thinking: false }));
        }
      },
    }),
    {
      name: 'tell-liora-thread',
      storage: createJSONStorage(() => storage),
      partialize: ({ messages, history }) => ({ messages, history }),
    },
  ),
);

// Delete everything wipes the disk but not memory, so the thread follows the log store down.
useLogStore.subscribe((now, before) => {
  const hadData = before.entries.length > 0 || before.setup !== null || before.periods.length > 0;
  const empty = now.entries.length === 0 && now.setup === null && now.periods.length === 0 && now.moods.length === 0;
  if (hadData && empty) useCompanionStore.getState().wipe();
});
