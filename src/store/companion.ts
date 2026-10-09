import { format } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { heavyHeart, languageOf, painTooMuch, seriousForAnyone, severityOnly, triage } from '../core/agent';
import { composeReply, ruleIntent, type ReplyBlock } from '../core/companion';
import { dangerRulesApply } from '../core/pipeline';
import { beginProbe, endProbe, noteTurn, timedSync } from '../core/probe';
import { canSay, commit, revert, say } from './agent';
import { contextFrom, readProfile } from './profile';
import { useMemoryStore } from './memory';
import { useLogStore } from './log';
import { storage } from './storage';
import { useTellStore } from './tell';
import { toTrace, useTraceStore } from './trace';
import { CONVERSATION_MS, isNewConversation, recentTurns } from './thread';
import { runTurn, type AgentTurn } from './turn';
import { mentionsSelfHarm } from '../core/agent/crisis';
import { mentionsLoss } from '../core/agent/loss';
import { carryOver, continuesTopic, corrects, dateAnswer } from '../core/agent/carry';
import { WRITE_TOOLS, type AgentAction, type SavedItem } from '../core/agent';
import { followUpAnswer } from '../core/agent/followon';
import { afterBirthCard, warningSignsCard } from '../core/agent/warning';
import { goodNews } from '../core/agent/news';

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
  // Every past conversation; the one she is in stays.
  clearHistory(): void;
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

// Her previous message, if it came in the last ten minutes.
function lastHerText(messages: ThreadMessage[], now = Date.now()): string | null {
  const m = [...messages].reverse().find((x) => x.role === 'her');
  if (!m?.text || (m.at && now - Date.parse(m.at) > 10 * 60 * 1000)) return null;
  return m.text;
}

// What Liora saved in her last reply, if that reply came in this conversation.
function lastSaved(messages: ThreadMessage[], now = Date.now()): SavedItem[] {
  const last = [...messages].reverse().find((m) => m.role === 'liora');
  if (!last || (last.at && now - Date.parse(last.at) > CONVERSATION_MS)) return [];
  return (last.blocks ?? []).flatMap((b) => (b.kind === 'logged' ? b.items : []));
}

// The confirm block in Liora's last reply, still waiting for her tap.
function lastWaiting(messages: ThreadMessage[]): { confirmId: string; actions: AgentAction[] } | null {
  const last = [...messages].reverse().find((m) => m.role === 'liora');
  const block = last?.blocks?.find((b) => b.kind === 'confirm');
  return block?.kind === 'confirm' ? { confirmId: block.confirmId, actions: block.actions } : null;
}

// A serious sign she described earlier in this conversation, while she is not pregnant.
function activeSerious(messages: ThreadMessage[], now = Date.now()): boolean {
  for (const m of [...messages].reverse()) {
    if (m.at && now - Date.parse(m.at) > CONVERSATION_MS) return false;
    if (m.blocks?.some((b) => b.kind === 'text' && (b.key === 'companion.serious.anyone' || b.key === 'companion.serious.still'))) return true;
  }
  return false;
}

// The go-now from earlier in this conversation (the last 30 minutes), as the decision stands now.
function activeGoNow(messages: ThreadMessage[], now = Date.now()): string | null {
  const entries = useLogStore.getState().entries;
  for (const m of [...messages].reverse()) {
    if (m.at && now - Date.parse(m.at) > CONVERSATION_MS) break;
    for (const b of m.blocks ?? []) {
      if (b.kind !== 'decision') continue;
      const level = entries.find((e) => e.id === b.entryId)?.decision.level ?? b.level;
      if (level === 'go_now') return b.entryId;
    }
  }
  return null;
}

// Liora's last message is still asking the follow-up for this entry.
function asksFollowUp(messages: ThreadMessage[], entryId: string): boolean {
  const last = [...messages].reverse().find((m) => m.role === 'liora');
  return !!last?.blocks?.some((b) => b.kind === 'decision' && b.entryId === entryId && b.level === 'follow_up');
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
      clearHistory: () => set({ history: [] }),
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
        const opening = isNewConversation(get().messages);
        const goNow = activeGoNow(get().messages);
        const seriousEarlier = activeSerious(get().messages);
        // "Sobrang sakit" right after "masakit ulo ko" is about the headache: the rules read both together.
        const before = lastHerText(get().messages);
        const ruleText = before && severityOnly(text) ? `${before}. ${text}` : text;
        // "Pati kahapon", "kahapon pala", "burahin mo": about what Liora just saved.
        // "Hindi naman masyado" right after Liora saved a symptom, with no question asked: noted.
        const mild = followUpAnswer(text) === 'no' && lastSaved(get().messages).some((i) => i.kind === 'symptoms');
        const waiting = lastWaiting(get().messages);
        const dated = waiting ? dateAnswer(text, waiting.actions, today()) : null;
        const carried = dated ?? carryOver(text, lastSaved(get().messages), today());
        const already = carried !== null && carried.length === 0;
        const correcting = !carried && corrects(text, lastSaved(get().messages));
        // "Bakit kaya?" right after "masakit puson ko": a question about that, so the card search reads both.
        const topic = before && !carried && continuesTopic(text) ? `${before}. ${text}` : undefined;
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
        // Words about not wanting to live go straight to the crisis screen's fixed copy and NCMH 1553:
        // nothing is logged and no model words a reply.
        if (mentionsSelfHarm(text)) {
          add([{ kind: 'text', key: 'crisis.headline' }, { kind: 'crisis' }]);
          set({ thinking: false });
          return;
        }
        // A short "hindi" or "oo" right after "Sobrang sakit ba?" answers that question, as the card's buttons do.
        const pending = useTellStore.getState().current;
        const typed = pending?.decision.level === 'follow_up' && asksFollowUp(get().messages, pending.id) ? followUpAnswer(text) : null;
        if (pending && typed) {
          try {
            const next = await useTellStore.getState().answerFollowUp(typed);
            const level = next.decision.level;
            add(
              level === 'ok'
                ? [{ kind: 'text', key: 'companion.symptom.ok' }, { kind: 'decision', entryId: next.id, level }]
                : [{ kind: 'text', key: typed === 'skip' ? 'companion.symptom.skipped' : `companion.symptom.${level}` }, { kind: 'decision', entryId: next.id, level }],
            );
          } finally {
            set({ thinking: false });
          }
          return;
        }
        if ((mild || already) && !typed) {
          add([{ kind: 'reply', text: null, fallback: { key: already ? 'reply.already' : 'reply.noted' } }]);
          set({ thinking: false });
          return;
        }
        const work = async () => {
          const entry = await useTellStore.getState().submit(ruleText, input, topic);
          mark(`rules decided ${entry.decision.level}${entry.decision.follow_up ? ` (asks ${entry.decision.follow_up.question_id})` : ''}`);
          const { setup, cycleSettings } = useLogStore.getState();
          const profile = readProfile(setup);
          const day = today();
          const triaged = timedSync('triage', () => triage(ruleText, day, profile.status));
          const read = carried
            ? { ...triaged, purpose: 'update' as const, actions: carried }
            : topic
              ? { ...triaged, purpose: 'health' as const, actions: [{ tool: 'health_question' as const }] }
              : correcting && triaged.actions.some((a) => (WRITE_TOOLS as readonly string[]).includes(a.tool))
                ? { ...triaged, actions: [{ tool: 'undo_last' as const }, ...triaged.actions] }
                : triaged;
          noteTurn({ purpose: read.purpose, typedScope: read.typed, tools: read.actions.map((a) => a.tool) });
          // A danger turn gets the rules' fixed decision block and no model-written words. When the
          // WHO rules do not cover her (not pregnant), a danger word is logged like any symptom.
          const rulesApply = dangerRulesApply(contextFrom(profile), input, ruleText);
          const urgent = entry.decision.level !== 'ok' || (read.purpose === 'urgent' && rulesApply);
          let turn: AgentTurn | null = null;
          if (!urgent) {
            try {
              turn = await runTurn(text, entry, day, thread, read, opening);
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
          // A go-now earlier in this conversation stays in front of her: fixed words, the card again, no model.
          const kept = turn.attachments.filter((b) => b.kind === 'steps' || b.kind === 'logged' || b.kind === 'confirm');
          if (goNow) {
            add([{ kind: 'text', key: 'companion.go_now.still' }, ...kept, { kind: 'decision', entryId: goNow, level: 'go_now' }]);
            return;
          }
          // Not pregnant, so the WHO pregnancy rules stay out, but signs like losing sight or fits should not
          // wait for anyone: a plain "do not wait" and her contact, no model words, and it stays in view.
          if (!rulesApply && seriousForAnyone(entry.findings)) {
            add([{ kind: 'text', key: 'companion.serious.anyone' }, ...kept, { kind: 'contact' }]);
            return;
          }
          if (seriousEarlier) {
            add([{ kind: 'text', key: 'companion.serious.still' }, ...kept, { kind: 'contact' }]);
            return;
          }
          // Feelings that are too much: a fixed caring line, the mood check and her contact, no model words.
          if (heavyHeart(text)) {
            add([{ kind: 'text', key: 'companion.heavy_heart' }, ...kept, { kind: 'actions', items: ['mood_check'] }, { kind: 'contact' }]);
            return;
          }
          // Pain she cannot bear gets a fixed caring line and her own Call and Text buttons, no model words.
          if (painTooMuch(text)) {
            add([{ kind: 'text', key: 'companion.pain.strong' }, ...kept, { kind: 'contact' }]);
            return;
          }
          // Losing a pregnancy gets a fixed caring line and her own Call and Text buttons, no model words.
          if (mentionsLoss(text)) {
            add([{ kind: 'text', key: 'companion.loss' }, ...kept, { kind: 'contact' }]);
            return;
          }
          // A sign on the DOH warning-signs list that the WHO rules do not cover (her baby not moving,
          // swelling, dizziness…): that cited card, verbatim, under a fixed line, and no model words.
          // After birth, the WHO go-soon list (stitches, wound, urine, breasts) instead.
          const warning =
            profile.status === 'pregnant' ? warningSignsCard(ruleText) : profile.status === 'postpartum' ? afterBirthCard(ruleText) : null;
          if (warning && !turn.attachments.some((b) => b.kind === 'card')) {
            // The timeline must agree with the card she sees.
            const found = kept.map((b) => (b.kind === 'steps' ? { ...b, steps: b.steps.map((st) => (st.kind === 'sources' ? { ...st, found: true } : st)) } : b));
            add([{ kind: 'reply', text: null, fallback: { key: 'reply.card' } }, ...found, { kind: 'card', cardId: warning }]);
            return;
          }
          // "Ilang weeks na ako?": her weeks are in her profile, so even without a model she gets them.
          const asksWeeks = /\bilang\s+(?:weeks|linggo)\b|\bhow\s+many\s+weeks\b|\bwhat\s+week\b|\bpang-?ilang\s+(?:week|linggo)\b/i.test(text);
          const asksDue = /\bkailan\s+(?:ako\s+)?(?:manganganak|manganak)\b|\bdue\s+date\b|\bkabuwanan\s+ko\b|\bwhen\s+(?:will|am|do)\s+i\s+(?:give\s+birth|deliver|due)\b|\bwhen\s+is\s+(?:my\s+)?(?:baby|due)\b/i.test(text);
          const quiet = !turn.attachments.some((b) => b.kind === 'logged' || b.kind === 'confirm');
          if ((asksWeeks || asksDue) && profile.status === 'pregnant' && profile.weeks !== undefined && quiet) {
            turn = { ...turn, fallback: { key: asksDue ? 'reply.due' : 'reply.weeks', params: { n: String(profile.weeks) } }, attachments: turn.attachments.filter((b) => b.kind !== 'actions' || asksWeeks) };
          }
          // Good news about her baby: Liora is glad with her, and anything it saved stays.
          if (goodNews(text) && entry.findings.length === 0) {
            const steps = (b: ReplyBlock): ReplyBlock | null => {
              if (b.kind !== 'steps') return b.kind === 'actions' || b.kind === 'card' ? null : b;
              const left = b.steps.filter((st) => st.kind !== 'sources');
              return left.length > 1 ? { ...b, steps: left } : null;
            };
            turn = { ...turn, fallback: { key: 'reply.glad' }, attachments: turn.attachments.map(steps).filter((b): b is ReplyBlock => b !== null) };
          }
          const id = add([{ kind: 'reply', text: null, fallback: turn.fallback }, ...turn.attachments]);
          // Her date answered the question, so the old "which day?" card goes.
          if (dated && waiting) set((s) => ({ messages: dropBlock(s.messages, (b) => b.kind === 'confirm' && b.confirmId === waiting.confirmId) }));
          const undone = turn.undoneId;
          if (undone) set((s) => ({ messages: dropBlock(s.messages, (b) => b.kind === 'logged' && b.undoId === undone) }));
          if (canSay() && !turn.noModel) {
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
      // Loading from disk happens once, when the app starts fresh: she meets an empty chat, and the
      // conversation she left goes to history. Leaving the tab or backgrounding the app keeps it.
      onRehydrateStorage: () => (state) => state?.clear(),
    },
  ),
);

// Delete everything wipes the disk but not memory, so the thread follows the log store down.
useLogStore.subscribe((now, before) => {
  const hadData = before.entries.length > 0 || before.setup !== null || before.periods.length > 0;
  const empty = now.entries.length === 0 && now.setup === null && now.periods.length === 0 && now.moods.length === 0;
  if (hadData && empty) useCompanionStore.getState().wipe();
});
