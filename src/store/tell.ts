import { create } from 'zustand';
import { modelTime } from '../core/timing';
import { applyFollowUpAnswer, dangerRulesApply, reopenFollowUp, runPipeline } from '../core/pipeline';
import type { Context, Entry } from '../core/types';
import { useLogStore } from './log';
import { contextFrom, readProfile } from './profile';
import { scopeAnswers, triage } from '../core/agent/triage';
import { format } from 'date-fns';
import { typedCache, typedKey } from '../core/cache/typed-cache';
import { noteHit, notePrompt, timed } from '../core/probe';

export type TellStatus = 'idle' | 'thinking' | 'done' | 'error';

export interface TellState {
  status: TellStatus;
  context: Context;
  current: Entry | null;
  error: string | null;
  setContext(context: Context): void;
  // `topic` is what the source card is searched with, when her message only follows on from the last one.
  submit(text: string, input?: 'text' | 'voice', topic?: string): Promise<Entry>;
  answerFollowUp(answer: 'yes' | 'no' | 'skip'): Promise<Entry>;
  // After a skip, bring the question back so she can answer it.
  reopenFollowUp(): Entry | null;
  reset(): void;
}

type AskModel = (text: string) => Promise<Record<string, number[]>>;

const MODEL_TIMEOUT_MS = 8000;
type ModelRef = Entry['models'][number];

let askModel: AskModel | null = null;
let modelRef: ModelRef | null = null;

type RetrieveCard = (text: string, context: Context) => Promise<string | null>;
const CARD_TIMEOUT_MS = 3000;
let retrieveCard: RetrieveCard | null = null;

// Card search only chooses which reviewed card a calm answer shows (SR-7); it never changes the decision.
export function setRetrieveCard(fn: RetrieveCard | null): void {
  retrieveCard = fn;
}

async function cardFor(text: string, context: Context): Promise<string | null> {
  if (!retrieveCard) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), modelTime(CARD_TIMEOUT_MS));
  });
  try {
    return await Promise.race([retrieveCard(text, context), timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// The ref is what "How Liora decided" lists when this model actually answered.
export function setAskModel(fn: AskModel | null, ref: ModelRef | null = null): void {
  askModel = fn;
  modelRef = fn ? ref : null;
  typedCache.clear();
}

// SR-2: the lexicon alone still decides when the model is missing, fails or is slow.
async function typedAnswers(text: string): Promise<Record<string, number[]> | undefined> {
  const ask = askModel;
  if (!ask) return undefined;
  if (modelRef?.prompts?.typed) notePrompt('typed', modelRef.prompts.typed);
  const key = modelRef ? typedKey(text, modelRef) : null;
  const cached = key ? typedCache.get(key) : undefined;
  if (cached) {
    noteHit('typed');
    return cached;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), modelTime(MODEL_TIMEOUT_MS));
  });
  try {
    const answers = await timed('typed', () => Promise.race([ask(text), timeout]));
    // Only a finished answer is kept; a timeout or an error is asked again next time.
    if (answers && key) typedCache.set(key, answers);
    return answers;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

export const useTellStore = create<TellState>()((set, get) => ({
  status: 'idle',
  context: { status: 'pregnant' },
  current: null,
  error: null,
  setContext: (context) => set({ context }),
  submit: async (text, input = 'text', topic) => {
    set({ status: 'thinking', error: null });
    try {
      // System 1 first: an edit or a question about her own data skips Gemma's danger questions;
      // the word list still runs on every message, so a danger word always counts.
      const today = format(new Date(), 'yyyy-MM-dd');
      const { typed } = triage(text, today, readProfile(useLogStore.getState().setup).status);
      const rulesApply = dangerRulesApply(get().context, input, text);
      const answers = typed === 'none' || !rulesApply ? undefined : scopeAnswers(await typedAnswers(text), typed);
      const entry = runPipeline({
        id: newId(),
        now: new Date(),
        text,
        input,
        context: get().context,
        typedAnswers: answers,
        models: answers && modelRef ? [modelRef] : [],
      });
      const card = entry.decision.level === 'ok' ? await cardFor(topic ?? text, get().context) : null;
      const saved = card ? { ...entry, card_ids: [card] } : entry;
      useLogStore.getState().addEntry(saved);
      set({ current: saved, status: 'done' });
      return saved;
    } catch (e) {
      set({ status: 'error', error: message(e) });
      throw e;
    }
  },
  answerFollowUp: async (answer) => {
    const { current, context } = get();
    if (!current?.decision.follow_up) {
      const e = new Error('There is no follow-up question to answer');
      set({ status: 'error', error: e.message });
      throw e;
    }
    const next = applyFollowUpAnswer(current, answer, context);
    useLogStore.getState().addEntry(next);
    set({ current: next, status: 'done', error: null });
    return next;
  },
  reopenFollowUp: () => {
    const { current, context } = get();
    if (current?.follow_up_answer?.answer !== 'skip') return null;
    const next = reopenFollowUp(current, context);
    useLogStore.getState().addEntry(next);
    set({ current: next, status: 'done', error: null });
    return next;
  },
  reset: () => set({ status: 'idle', current: null, error: null }),
}));

// The rules read her status from the saved profile, which survives a restart; this store does not.
// With no profile (a fresh install or after Delete everything) the rules use the safe default.
const syncContext = (setup: Parameters<typeof readProfile>[0]) => {
  useTellStore.setState({ context: contextFrom(readProfile(setup)) });
};
syncContext(useLogStore.getState().setup);
useLogStore.subscribe((now, before) => {
  if (now.setup !== before.setup) syncContext(now.setup);
});
