import { create } from 'zustand';
import { applyFollowUpAnswer, runPipeline } from '../core/pipeline';
import type { Context, Entry } from '../core/types';
import { useLogStore } from './log';

export type TellStatus = 'idle' | 'thinking' | 'done' | 'error';

export interface TellState {
  status: TellStatus;
  context: Context;
  current: Entry | null;
  error: string | null;
  setContext(context: Context): void;
  submit(text: string, input?: 'text' | 'voice'): Promise<Entry>;
  answerFollowUp(answer: 'yes' | 'no' | 'skip'): Promise<Entry>;
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
    timer = setTimeout(() => resolve(null), CARD_TIMEOUT_MS);
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
}

// SR-2: the lexicon alone still decides when the model is missing, fails or is slow.
async function typedAnswers(text: string): Promise<Record<string, number[]> | undefined> {
  if (!askModel) return undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), MODEL_TIMEOUT_MS);
  });
  try {
    return await Promise.race([askModel(text), timeout]);
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
  submit: async (text, input = 'text') => {
    set({ status: 'thinking', error: null });
    try {
      const answers = await typedAnswers(text);
      const entry = runPipeline({
        id: newId(),
        now: new Date(),
        text,
        input,
        context: get().context,
        typedAnswers: answers,
        models: answers && modelRef ? [modelRef] : [],
      });
      const card = entry.decision.level === 'ok' ? await cardFor(text, get().context) : null;
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
  reset: () => set({ status: 'idle', current: null, error: null }),
}));
