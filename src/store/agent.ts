import { applyActions, mergeActions, planActions, readActions, type AgentAction, type SavedItem, type Tone, type Undo } from '../core/agent';
import type { Intent } from '../core/companion';
import { useLogStore } from './log';
import { readProfile } from './profile';

type RouteActions = (text: string) => Promise<AgentAction[]>;
type WarmLine = (
  text: string,
  tone: Tone,
  ctx: { name?: string; saved: SavedItem[] },
  onToken?: (text: string) => void,
) => Promise<string | null>;

let routeActions: RouteActions | null = null;
let warmLine: WarmLine | null = null;

// Registered at boot like setAskIntent; without them the word rules and fixed lines carry on alone.
export function setRouteActions(fn: RouteActions | null): void {
  routeActions = fn;
}

export function setWarmLine(fn: WarmLine | null): void {
  warmLine = fn;
}

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

const dataNow = () => {
  const { periods, dayLogs, cycleSettings, setup } = useLogStore.getState();
  return { periods, dayLogs, cycleSettings, setup };
};

export interface Understood {
  actions: AgentAction[];
  // The intent the router found when the word rules found none.
  intent: Intent | null;
}

const ROUTED_INTENT: Partial<Record<AgentAction['tool'], Intent>> = {
  cycle_question: 'cycle_question',
  health_question: 'health_question',
  smalltalk: 'greeting',
};

// Rules first. Gemma is asked only when the rules read nothing and the intent is unclear.
export async function understand(text: string, ruled: Intent, today: string): Promise<Understood> {
  const fromRules = readActions(text, today);
  const fromGemma = fromRules.length === 0 && ruled === 'other' ? await routed(text) : [];
  const actions = mergeActions(fromRules, fromGemma);
  const intent = ruled === 'other' ? (actions.map((a) => ROUTED_INTENT[a.tool]).find(Boolean) ?? null) : null;
  return { actions, intent };
}

export function plan(actions: AgentAction[], today: string) {
  const profile = readProfile(useLogStore.getState().setup);
  return planActions(actions, dataNow(), profile.status, today);
}

const undos = new Map<string, Undo>();
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Writes through the log store so it persists; keeps the old slices by id for Undo.
export function commit(actions: AgentAction[], today: string): { undoId: string; saved: SavedItem[] } | null {
  if (actions.length === 0) return null;
  const applied = applyActions(actions, dataNow(), today);
  if (applied.saved.length === 0) return null;
  const log = useLogStore.getState();
  const { periods, dayLogs, setup, cycleSettings } = applied.data;
  if (periods) log.setPeriods(periods);
  if (dayLogs) log.setDayLogs(dayLogs);
  if (cycleSettings) log.setCycleSettings(cycleSettings);
  if (setup !== undefined) restoreSetup(setup);
  const undoId = newId();
  undos.set(undoId, applied.undo);
  return { undoId, saved: applied.saved };
}

function restoreSetup(setup: Record<string, unknown> | null): void {
  if (setup) useLogStore.getState().setSetup(setup);
  else useLogStore.setState({ setup: null });
}

export function revert(undoId: string): boolean {
  const undo = undos.get(undoId);
  if (!undo) return false;
  undos.delete(undoId);
  const log = useLogStore.getState();
  if (undo.periods) log.setPeriods(undo.periods);
  if (undo.dayLogs) log.setDayLogs(undo.dayLogs);
  if (undo.setup !== undefined) restoreSetup(undo.setup);
  return true;
}

// Null means show the fixed line for this tone.
export async function warm(
  text: string,
  tone: Tone,
  ctx: { name?: string; saved: SavedItem[] },
  onToken?: (text: string) => void,
): Promise<string | null> {
  if (!warmLine) return null;
  try {
    return await warmLine(text, tone, ctx, onToken);
  } catch {
    return null;
  }
}
