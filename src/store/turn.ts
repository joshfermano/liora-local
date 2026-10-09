import {
  contextPack,
  cycleFacts,
  looksLikeInjection,
  messageLanguage,
  moodsOn,
  dayFacts,
  dayHasData,
  replyPlan,
  resolveDate,
  smalltalkKind,
  toneOf,
  withoutMemory,
  type AgentAction,
  type AgentData,
  type ContextInput,
  type Fallback,
  type Outcome,
  type ReplyRequest,
  type Triage,
  type Turn,
} from '../core/agent';
import { composeReply, type ReplyBlock } from '../core/companion';
import type { Entry, MoodResult } from '../core/types';
import { commit, dataNow, plan, revertLatest, understand } from './agent';
import { useLogStore } from './log';
import { lastResult } from './memo';
import { noteHit, noteTurn } from '../core/probe';
import { useMemoryStore } from './memory';
import { contextFrom, readProfile } from './profile';

export interface AgentTurn {
  // The blocks that go under the reply: what was saved, what waits for her tap, a card, a cycle answer.
  attachments: ReplyBlock[];
  fallback: Fallback;
  // What Gemma is given to word the reply.
  request: ReplyRequest;
  // The earlier `logged` block this turn undid, so the thread can drop it.
  undoneId: string | null;
  // An attempt to give Liora new instructions: nothing is read or written, and no model runs.
  noModel?: boolean;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
// Her data only changes when a log slice is replaced, so the same slices give the same pack.
export const packFor = lastResult(
  (
    periods: AgentData['periods'],
    dayLogs: AgentData['dayLogs'],
    cycleSettings: AgentData['cycleSettings'],
    setup: AgentData['setup'],
    entries: Entry[],
    moodChecks: MoodResult[],
    notes: string[],
    language: NonNullable<ContextInput['memory']>['language'],
    day: string,
  ) => {
    const profile = readProfile(setup);
    return contextPack({
      data: { periods, dayLogs, cycleSettings, setup },
      entries,
      moodChecks,
      profile: { name: profile.name, age: profile.age, status: profile.status, weeks: profile.weeks, bloodType: profile.bloodType, emergency: profile.emergency },
      today: day,
      memory: { notes, language },
    });
  },
);
const HOME = ['checklist', 'mood_check', 'calendar'] as const;

function pick<T extends AgentAction['tool']>(actions: AgentAction[], tool: T): Extract<AgentAction, { tool: T }> | undefined {
  return actions.find((a): a is Extract<AgentAction, { tool: T }> => a.tool === tool);
}

// One calm turn: decide with the rules (Gemma only fills a gap), act through the tools, and collect
// what happened. The reply is worded from that, never decided by it.
export async function runTurn(text: string, entry: Entry, day: string, thread: Turn[], read: Triage): Promise<AgentTurn> {
  if (looksLikeInjection(text)) {
    noteTurn({ tools: [] });
    return {
      attachments: [{ kind: 'actions', items: [...HOME] }],
      fallback: { key: 'reply.guarded' },
      request: { text: '', pack: '', facts: {}, allowed: {}, thread: [] },
      undoneId: null,
      noModel: true,
    };
  }
  // A question about her own data is answered from her data: no source card, and no router to ask.
  const asksAboutHerData = read.purpose === 'ask';
  const understood = asksAboutHerData ? read.actions : await understand(text, read.actions);
  // A note is stored only on a calm turn: never when the rules or the model saw a danger sign.
  const calm = read.purpose !== 'urgent' && entry.decision.level === 'ok';
  const actions = calm ? understood : withoutMemory(understood);
  noteTurn({ tools: actions.map((a) => a.tool) });
  const outcome: Outcome = {
    saved: [],
    waiting: false,
    undid: null,
    nothingToUndo: false,
    notFound: false,
    cycle: null,
    day: null,
    card: null,
    opened: null,
    smalltalk: null,
    asksAboutHerData,
  };
  const attachments: ReplyBlock[] = [];
  let undoneId: string | null = null;

  if (pick(actions, 'undo_last')) {
    const back = revertLatest();
    outcome.undid = back?.saved ?? null;
    outcome.nothingToUndo = back === null;
    undoneId = back?.id ?? null;
  }

  const { apply, confirm } = plan(actions, day);
  const done = commit(apply, day);
  outcome.saved = done?.saved ?? [];
  outcome.waiting = confirm.length > 0;
  const removing = actions.some((a) => a.tool === 'delete_period' || a.tool === 'clear_day');
  outcome.notFound = removing && !outcome.saved.some((i) => i.kind === 'period_deleted' || i.kind === 'day_cleared');
  outcome.noteNotFound = actions.some((a) => a.tool === 'forget') && !outcome.saved.some((i) => i.kind === 'forgot');
  if (done) attachments.push({ kind: 'logged', items: done.saved, undoId: done.undoId });
  if (confirm.length > 0) attachments.push({ kind: 'confirm', actions: confirm, confirmId: newId() });

  const log = useLogStore.getState();
  const data = dataNow();
  const profile = readProfile(log.setup);

  const askDay = pick(actions, 'ask_day');
  if (askDay) {
    const date = resolveDate(askDay.date, day) ?? day;
    outcome.day = { date, facts: dayFacts(data, date), hasData: dayHasData(data, date) };
    attachments.push({ kind: 'actions', items: ['calendar'] });
  }

  if (pick(actions, 'cycle_question')) {
    const composed = composeReply({
      intent: 'cycle_question',
      entry,
      context: contextFrom(profile),
      periods: data.periods,
      cycleSettings: data.cycleSettings,
      today: day,
      cardId: null,
      name: profile.name,
    });
    const words = composed.find((b) => b.kind === 'text');
    outcome.cycle = { facts: cycleFacts(data, profile.status, day), textKey: words?.kind === 'text' ? words.key : null };
    attachments.push(...composed.filter((b) => b.kind === 'cycle_answer' || b.kind === 'actions'));
  }

  if (pick(actions, 'health_question') && !asksAboutHerData) {
    const cardId = entry.card_ids[0] ?? null;
    outcome.card = cardId !== null;
    attachments.push(cardId ? { kind: 'card', cardId } : { kind: 'actions', items: ['checklist'] });
  }

  if (pick(actions, 'contact')) {
    outcome.contact = true;
    attachments.push({ kind: 'contact' });
  }

  const open = pick(actions, 'open');
  if (open) {
    outcome.opened = open.screen;
    attachments.push({ kind: 'actions', items: [open.screen] });
  }

  if (actions.every((a) => a.tool === 'smalltalk')) {
    outcome.smalltalk = smalltalkKind(text) ?? (pick(actions, 'smalltalk') ? 'chat' : null);
    if (outcome.smalltalk === 'greeting') attachments.push({ kind: 'actions', items: [...HOME] });
  }

  if (entry.findings.length > 0) attachments.push({ kind: 'decision', entryId: entry.id, level: entry.decision.level });

  const tone = toneOf(text, entry);
  const { facts, fallback, style } = replyPlan(outcome, { name: profile.name, tone, today: day, moods: moodsOn(data.dayLogs, day) });
  if (attachments.length === 0) {
    if (asksAboutHerData) attachments.push({ kind: 'actions', items: ['calendar'] });
    else if (facts.no_action_taken === true) attachments.push({ kind: 'actions', items: [...HOME] });
  }

  const memory = useMemoryStore.getState();
  const { value: pack, hit } = packFor(data.periods, data.dayLogs, data.cycleSettings, data.setup, log.entries, log.moods, memory.notes, memory.language, day);
  if (hit) noteHit('context');
  return {
    attachments,
    fallback,
    request: { text, pack: pack.text, facts, allowed: { ...pack.facts, ...facts }, thread, style, language: messageLanguage(text, memory.language ?? 'english') },
    undoneId,
  };
}
