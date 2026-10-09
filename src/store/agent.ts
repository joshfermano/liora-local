import { applyActions, applyMemory, mergeActions, planActions, undoable, type AgentAction, type JournalEntry, type ReplyRequest, type SavedItem, type Undo } from '../core/agent';
import { useJournalStore } from './journal';
import { useLogStore } from './log';
import { useMemoryStore } from './memory';
import { readProfile } from './profile';

type RouteActions = (text: string) => Promise<AgentAction[]>;
type SayReply = (req: ReplyRequest, onText?: (guarded: string) => void) => Promise<string | null>;

let routeActions: RouteActions | null = null;
let sayReply: SayReply | null = null;

// Registered at boot like setAskModel; without them the word rules and fixed lines carry on alone.
export function setRouteActions(fn: RouteActions | null): void {
  routeActions = fn;
}

export function setSayReply(fn: SayReply | null): void {
  sayReply = fn;
}

export const canSay = () => sayReply !== null;

const ROUTE_TIMEOUT_MS = 4500;

async function routed(text: string): Promise<AgentAction[]> {
  if (!routeActions) return [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AgentAction[]>((resolve) => {
    timer = setTimeout(() => resolve([]), ROUTE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([routeActions(text), timeout]);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export const dataNow = () => {
  const { periods, dayLogs, cycleSettings, setup } = useLogStore.getState();
  return { periods, dayLogs, cycleSettings, setup };
};

// Rules first (the triage already read them). Gemma is asked only when the rules found no tool.
export async function understand(text: string, fromRules: AgentAction[]): Promise<AgentAction[]> {
  return mergeActions(fromRules, fromRules.length === 0 ? await routed(text) : []);
}

export function plan(actions: AgentAction[], today: string) {
  const profile = readProfile(useLogStore.getState().setup);
  return planActions(actions, dataNow(), profile.status, today);
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Writes through the log store so it persists, and journals the old slices so Undo works even
// after the app restarts.
export function commit(actions: AgentAction[], today: string): { undoId: string; saved: SavedItem[] } | null {
  if (actions.length === 0) return null;
  const applied = applyActions(actions, dataNow(), today);
  const noted = applyMemory(actions, useMemoryStore.getState().notes);
  const saved = [...applied.saved, ...(noted?.saved ?? [])];
  if (saved.length === 0) return null;
  const log = useLogStore.getState();
  const { periods, dayLogs, setup, cycleSettings } = applied.data;
  if (periods) log.setPeriods(periods);
  if (dayLogs) log.setDayLogs(dayLogs);
  if (cycleSettings) log.setCycleSettings(cycleSettings);
  if (setup !== undefined) restoreSetup(setup);
  const undo: Undo = { ...applied.undo };
  if (noted) {
    undo.notes = useMemoryStore.getState().notes;
    useMemoryStore.getState().setNotes(noted.notes);
  }
  const id = newId();
  useJournalStore.getState().record({ id, at: new Date().toISOString(), saved, undo });
  return { undoId: id, saved };
}

function restoreSetup(setup: Record<string, unknown> | null): void {
  if (setup) useLogStore.getState().setSetup(setup);
  else useLogStore.setState({ setup: null });
}

function putBack({ id, undo }: JournalEntry): void {
  const log = useLogStore.getState();
  if (undo.periods) log.setPeriods(undo.periods);
  if (undo.dayLogs) log.setDayLogs(undo.dayLogs);
  if (undo.setup !== undefined) restoreSetup(undo.setup);
  if (undo.notes) useMemoryStore.getState().setNotes(undo.notes);
  useJournalStore.getState().drop(id);
}

// A Logged block's Undo works while its commit is in the journal, unless a newer change has since
// touched the same data.
export function revert(undoId: string): boolean {
  const entry = undoable(useJournalStore.getState().entries, undoId);
  if (!entry) return false;
  putBack(entry);
  return true;
}

export function revertLatest(): { id: string; saved: SavedItem[] } | null {
  const back = useJournalStore.getState().entries.at(-1);
  if (!back) return null;
  putBack(back);
  return { id: back.id, saved: back.saved };
}

// Null means the screen shows the fixed line.
export async function say(req: ReplyRequest, onText?: (guarded: string) => void): Promise<string | null> {
  if (!sayReply) return null;
  try {
    return await sayReply(req, onText);
  } catch {
    return null;
  }
}
