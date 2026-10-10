import { format, parseISO } from 'date-fns';
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
  recall,
  smalltalkKind,
  planNote,
  herAnswer,
  cycleTopic,
  stepsOf,
  toneOf,
  withoutMemory,
  type AgentAction,
  type CycleTopic,
  type AgentData,
  type ContextInput,
  type Fallback,
  type Outcome,
  type ReplyRequest,
  type Triage,
  type Turn,
} from '../core/agent';
import { composeReply, type ReplyBlock } from '../core/companion';
import { dangerRulesApply } from '../core/pipeline';
import type { Entry, MoodResult } from '../core/types';
import { commit, dataNow, plan, revertLatest, understand } from './agent';
import { useLogStore } from './log';
import { lastResult } from './memo';
import { aboutLiora, asksForHelp } from '../core/agent/about';
import { isQuestion } from '../core/agent/question';
import { noteHit, noteTurn } from '../core/probe';
import { useMemoryStore } from './memory';
import { en } from '../content/copy';
import { answerText, dayLine } from './answers';
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
      profile: { name: profile.name, age: profile.age, status: profile.status, weeks: profile.weeks, daysSinceBirth: profile.daysSinceBirth, bloodType: profile.bloodType, emergency: profile.emergency },
      today: day,
      memory: { notes, language },
    });
  },
);
const HOME = ['checklist', 'mood_check', 'calendar'] as const;
// The model only puts Liora's fixed line in her language and tone: composing from her data, it recited
// unrelated logs, offered things it cannot do and dropped what was saved. The one line it may go beyond is
// "not sure", where a question about her own data may still be answered from her data.
const COMPOSES = new Set(['reply.unsure']);
const fillCopy = (s: string, v: Record<string, string> = {}) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

const day = (iso: string) => format(parseISO(iso), 'MMM d');

// The cycle answer in words, for the question she asked: ovulation, fertile window or next period.
function cycleFallback(topic: CycleTopic, answer: Extract<ReplyBlock, { kind: 'cycle_answer' }>): Fallback {
  const { prediction, fertile } = answer;
  if (topic === 'ovulation') {
    return fertile
      ? { key: 'reply.cycle.ovulation', params: { from: day(fertile.ovulation.from), to: day(fertile.ovulation.to) } }
      : { key: 'reply.cycle.ovulation.none' };
  }
  if (topic === 'fertile') {
    return fertile ? { key: 'reply.cycle.fertile', params: { from: day(fertile.from), to: day(fertile.to) } } : { key: 'reply.cycle.ovulation.none' };
  }
  return { key: 'reply.cycle.next', params: { date: day(prediction.next_start), from: day(prediction.window.from), to: day(prediction.window.to) } };
}

function pick<T extends AgentAction['tool']>(actions: AgentAction[], tool: T): Extract<AgentAction, { tool: T }> | undefined {
  return actions.find((a): a is Extract<AgentAction, { tool: T }> => a.tool === tool);
}

// One calm turn: decide with the rules (Gemma only fills a gap), act through the tools, and collect
// what happened. The reply is worded from that, never decided by it.
export async function runTurn(
  text: string,
  entry: Entry,
  day: string,
  thread: Turn[],
  read: Triage,
  opening = thread.length === 0,
): Promise<AgentTurn> {
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
  // A question her notes answer ("sino OB ko?"): her own words back, quoted, and no model.
  const notes = useMemoryStore.getState().notes;
  const recalled = read.purpose !== 'urgent' && entry.decision.level === 'ok' && entry.findings.length === 0 ? recall(text, notes) : null;
  if (recalled) {
    noteTurn({ tools: [] });
    return {
      attachments: [{ kind: 'steps', steps: [{ kind: 'read' }, { kind: 'recalled', count: recalled.length }] }],
      fallback: recalled.length > 0 ? { key: 'reply.recall', params: { notes: recalled.map((n) => `“${n}”`).join(', ') } } : { key: 'reply.recall.none' },
      request: { text: '', pack: '', facts: {}, allowed: {}, thread: [] },
      undoneId: null,
      noModel: true,
    };
  }
  // A question about her own logs ("anong cycle day ko?", "kailan huling sumakit ulo ko?"): answered
  // from her data with fixed words, and nothing in it is logged.
  // Only the rules' own decision gates it: a sign named in a question about the past is not a report.
  const own = entry.decision.level === 'ok' ? herAnswer(text, dataNow(), readProfile(useLogStore.getState().setup).status, day) : null;
  if (own) {
    noteTurn({ tools: [] });
    return {
      attachments: [{ kind: 'steps', steps: [{ kind: 'read' }, { kind: 'looked' }] }, { kind: 'actions', items: ['calendar'] }],
      fallback: answerText(own),
      request: { text: '', pack: '', facts: {}, allowed: {}, thread: [] },
      undoneId: null,
      noModel: true,
    };
  }
  // Who Liora is, that she has no internet, and what she cannot do: a fixed answer, never a model's,
  // unless the same message carries a danger sign, which the usual turn handles first.
  const about = aboutLiora(text);
  // Off topic only when the rules found nothing of hers in it: nothing to log and no sign.
  // (Small talk counts as nothing: the reader files a general question as chat.)
  const nothingElse = read.actions.every((a) => a.tool === 'smalltalk' || a.tool === 'health_question') && entry.findings.length === 0;
  const unrelated = about === 'offtopic' && read.actions.every((a) => a.tool === 'smalltalk') && entry.findings.length === 0;
  // Talk about Liora herself ("kumusta ka?", "mahal kita") only answers alone; with a log in it, the log comes first.
  const social = about === 'name' || about === 'love' || about === 'sorry' || about === 'howareyou' || about === 'language';
  if (about && (about !== 'offtopic' || unrelated) && (!social || nothingElse) && read.purpose !== 'urgent' && entry.decision.level === 'ok') {
    noteTurn({ tools: [] });
    const name = readProfile(useLogStore.getState().setup).name;
    const fallback: Fallback =
      about === 'call'
        ? { key: 'reply.contact' }
        : about === 'name'
          ? name ? { key: 'reply.name', params: { name } } : { key: 'reply.name.none' }
          : about === 'love' || about === 'sorry' || about === 'howareyou'
            ? { key: `reply.${about}` }
            : { key: `reply.about.${about}` };
    return {
      attachments: about === 'call' ? [{ kind: 'contact' }] : about === 'love' || about === 'howareyou' || about === 'name' || about === 'language' ? [] : [{ kind: 'actions', items: [...HOME] }],
      fallback,
      request: { text: '', pack: '', facts: {}, allowed: {}, thread: [] },
      undoneId: null,
      noModel: true,
    };
  }
  // A question about her own data is answered from her data: no source card, and no router to ask.
  const asksAboutHerData = read.purpose === 'ask';
  // The router sees the last exchange, so "do it" or "sige" reads as what the chat was about.
  const lastOf = (role: Turn['role']) => [...thread].reverse().find((t) => t.role === role)?.text;
  const before = { her: lastOf('her'), liora: lastOf('liora') };
  const understood = asksAboutHerData && read.actions.length > 0 ? read.actions : await understand(text, read.actions, before);
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
  // A visit she has coming up and nothing else to save: offer to remember it, behind her tap.
  const upcoming = !done && confirm.length === 0 && calm ? planNote(text) : null;
  if (upcoming) {
    attachments.push({ kind: 'confirm', actions: [{ tool: 'remember', note: upcoming }], confirmId: newId() });
    outcome.waiting = true;
  }

  const log = useLogStore.getState();
  const data = dataNow();
  const profile = readProfile(log.setup);

  const askDay = pick(actions, 'ask_day');
  if (askDay) {
    const date = resolveDate(askDay.date, day) ?? day;
    outcome.day = { date, facts: dayFacts(data, date), hasData: dayHasData(data, date) };
    attachments.push({ kind: 'actions', items: ['calendar'] });
  }

  let cycleReply: Fallback | null = null;
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
    const answer = composed.find((b) => b.kind === 'cycle_answer');
    if (answer?.kind === 'cycle_answer') cycleReply = cycleFallback(cycleTopic(text), answer);
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

  if (actions.every((a) => a.tool === 'smalltalk') && !asksForHelp(text)) {
    outcome.smalltalk = smalltalkKind(text) ?? (pick(actions, 'smalltalk') ? 'chat' : null);
    if (outcome.smalltalk === 'greeting') attachments.push({ kind: 'actions', items: [...HOME] });
  }

  // A question about a sign ("normal ba sumakit likod?") gets no decision card unless the rules raised it.
  const reported = actions.some((a) => a.tool === 'symptoms') || entry.decision.level !== 'ok';
  if (entry.findings.length > 0 && reported && dangerRulesApply(contextFrom(profile), entry.input, text)) {
    attachments.push({ kind: 'decision', entryId: entry.id, level: entry.decision.level });
  }

  const tone = toneOf(text, entry);
  const { facts, fallback: planned, style } = replyPlan(outcome, { name: profile.name, tone, today: day, moods: moodsOn(data.dayLogs, day), said: pick(actions, 'moods')?.moods, hurting: Boolean(pick(actions, 'symptoms')) || entry.findings.length > 0,
    hurtingToday: (data.dayLogs.find((l) => l.date === day)?.symptoms.length ?? 0) > 0,
  });
  // "Buntis ako" when her profile already says so: tell her, rather than a blank reply.
  const stated = pick(actions, 'set_status');
  const sameStatus = !!stated && stated.status === profile.status && outcome.saved.length === 0 && !outcome.waiting;
  // Low moods while pregnant or after birth: the mood check is one tap away, and the line says so.
  const low = outcome.saved.some((i) => i.kind === 'moods' && i.values.some((m) => m === 'sad' || m === 'anxious' || m === 'stressed'));
  const offerCheck = low && profile.status !== 'neither' && profile.status !== undefined;
  if (offerCheck) attachments.push({ kind: 'actions', items: ['mood_check'] });
  const dayLog = outcome.day?.hasData ? data.dayLogs.find((l) => l.date === outcome.day!.date) : undefined;
  const dayReply: Fallback | null = dayLog && planned.key === 'reply.day' && dayLine(dayLog) ? { key: 'her.day', params: { date: format(parseISO(dayLog.date), 'MMM d'), list: dayLine(dayLog) } } : null;
  // "My name is Ana" when it already is: say so rather than a generic line.
  const renamed = pick(actions, 'set_name');
  const sameName: Fallback | null = renamed && renamed.name === profile.name && outcome.saved.length === 0 ? { key: 'reply.name', params: { name: renamed.name } } : null;
  const fallback = upcoming ? { key: 'reply.offer_remember' } : sameName ?? dayReply ?? (cycleReply && planned.key === 'reply.cycle' ? cycleReply : sameStatus ? { key: 'reply.status.same' } : offerCheck && planned.key.startsWith('reply.saved') ? { key: 'reply.saved.mood_check' } : planned);
  if (attachments.length === 0) {
    if (asksAboutHerData) attachments.push({ kind: 'actions', items: ['calendar'] });
    else if (facts.no_action_taken === true) attachments.push({ kind: 'actions', items: [...HOME] });
  }

  // She asked something and no tool answered it: say so honestly, with what Liora can answer. The model
  // is not asked to fill the gap, because then it improvises offers and unrelated logs. A question about
  // her own data (her blood type, her name) may still be answered from her data, with the same honest
  // line if nothing it says survives the guard.
  const unanswered = isQuestion(text) && stepsOf(outcome).length === 0 && outcome.smalltalk === null && !asksForHelp(text);
  if (unanswered && !asksAboutHerData) {
    return {
      attachments: [{ kind: 'actions', items: [...HOME] }],
      fallback: { key: 'reply.unsure' },
      request: { text: '', pack: '', facts: {}, allowed: {}, thread: [] },
      undoneId: null,
      noModel: true,
    };
  }

  const steps = stepsOf(outcome);
  if (steps.length > 0) attachments.unshift({ kind: 'steps', steps });

  const memory = useMemoryStore.getState();
  const { value: pack, hit } = packFor(data.periods, data.dayLogs, data.cycleSettings, data.setup, log.entries, log.moods, memory.notes, memory.language, day);
  if (hit) noteHit('context');
  const final = unanswered ? { key: 'reply.unsure' } : fallback;
  const answer = COMPOSES.has(final.key) ? undefined : fillCopy(en(final.key), final.params);
  return {
    attachments,
    fallback: final,
    request: {
      text,
      answer,
      pack: pack.text,
      facts,
      // Her own words in this chat may be repeated back to her, so the guard counts them as known.
      allowed: {
        ...pack.facts,
        ...facts,
        her_words: [...thread.filter((t) => t.role === 'her').map((t) => t.text), text],
        her_signs: entry.findings.map((f) => f.code),
      },
      thread,
      style,
      language: messageLanguage(text, memory.language ?? 'english'),
      opening,
    },
    undoneId,
  };
}
