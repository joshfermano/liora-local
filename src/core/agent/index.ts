import type { Entry } from '../types';
import type { AgentAction, AgentData, AgentPlan, Applied, DateWord, Tone, VadState } from './types';

export * from './types';

// Placeholders until the implementations land; every export keeps this exact signature.

// The word rules' reading of her message: period start or end, flow, symptoms, moods, activities,
// weeks pregnant, and whether it asks about her cycle or her health.
export function readActions(_text: string, _today: string): AgentAction[] {
  return [];
}

// Rules win: Gemma's actions only fill tools the rules did not find.
export function mergeActions(rules: AgentAction[], _gemma: AgentAction[]): AgentAction[] {
  return rules;
}

export function resolveDate(_word: DateWord, _today: string): string | null {
  return null;
}

export function planActions(_actions: AgentAction[], _data: AgentData, _status: string | undefined, _today: string): AgentPlan {
  return { apply: [], confirm: [] };
}

export function applyActions(_actions: AgentAction[], _data: AgentData, _today: string): Applied {
  return { data: {}, undo: {}, saved: [] };
}

export function toneOf(_text: string, _entry: Entry): Tone {
  return 'neutral';
}

// Returns the warm line if it is safe to show, or null so a fixed line is used instead.
export function guardWarm(_text: string): string | null {
  return null;
}

// Silence detection over the recorder's metering (dBFS), one sample every 100 ms.
export interface Vad {
  push(db: number, atMs: number): VadState;
  reset(): void;
}
export function createVad(): Vad {
  return { push: () => 'waiting', reset: () => {} };
}
