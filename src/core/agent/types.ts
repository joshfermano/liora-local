import type { Activity, CycleSettings, DayLog, Flow, Mood, PeriodRecord, Symptom } from '../types';

// What she said, turned into closed actions. Code resolves every date; neither the word rules nor
// Gemma ever write one.
export type DateWord =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'days_ago'; n: number }
  | { kind: 'date'; date: string }
  | { kind: 'unknown' };

export type AgentAction =
  | { tool: 'period_start'; date: DateWord; flow: Flow | null }
  | { tool: 'period_end'; date: DateWord }
  | { tool: 'flow'; date: DateWord; flow: Flow }
  | { tool: 'symptoms'; date: DateWord; symptoms: Symptom[] }
  | { tool: 'moods'; date: DateWord; moods: Mood[] }
  | { tool: 'activities'; date: DateWord; activities: Activity[] }
  | { tool: 'weeks'; weeks: number }
  | { tool: 'delete_period'; date: DateWord; span?: 'month' | 'all' }
  | { tool: 'clear_day'; date: DateWord; what: 'all' | 'flow' | 'symptoms' | 'moods' | 'activities' }
  | { tool: 'undo_last' }
  | { tool: 'set_status'; status: 'pregnant' | 'postpartum' | 'neither' }
  | { tool: 'remember'; note: string }
  | { tool: 'forget'; note?: string; all?: boolean }
  | { tool: 'ask_day'; date: DateWord }
  | { tool: 'open'; screen: Screen }
  | { tool: 'cycle_question' }
  | { tool: 'health_question' }
  | { tool: 'smalltalk' };

export type Screen = 'calendar' | 'mood_check' | 'checklist' | 'profile' | 'log_day';

export type Tool = AgentAction['tool'];
export const WRITE_TOOLS = [
  'period_start', 'period_end', 'flow', 'symptoms', 'moods', 'activities', 'weeks', 'delete_period', 'clear_day', 'set_status',
] as const;

// Plain data the responder may use; every number in Gemma's reply must appear here.
export type Facts = Record<string, string | number | boolean | string[] | null>;

// The parts of her data an action may touch.
export interface AgentData {
  periods: PeriodRecord[];
  dayLogs: DayLog[];
  cycleSettings: CycleSettings;
  setup: Record<string, unknown> | null;
}

// Policy: clear logs are saved at once; anything that replaces data, needs a date or changes her
// status waits for her tap.
export interface AgentPlan {
  apply: AgentAction[];
  confirm: AgentAction[];
}

// One line of the "Saved" block, in plain data; the screen words it from copy.
export type SavedItem =
  | { kind: 'period_start'; date: string; end?: string }
  | { kind: 'period_end'; date: string }
  | { kind: 'flow'; date: string; flow: Flow }
  | { kind: 'symptoms'; date: string; values: Symptom[] }
  | { kind: 'moods'; date: string; values: Mood[] }
  | { kind: 'activities'; date: string; values: Activity[] }
  | { kind: 'weeks'; weeks: number }
  | { kind: 'status'; status: 'pregnant' | 'postpartum' | 'neither' }
  | { kind: 'period_deleted'; date: string; end?: string | null }
  | { kind: 'day_cleared'; date: string; what: 'all' | 'flow' | 'symptoms' | 'moods' | 'activities' }
  | { kind: 'remembered'; note: string }
  // null note: she asked Liora to forget everything.
  | { kind: 'forgot'; note: string | null };

// The slices as they were before an apply, so Undo can put them back exactly.
export interface Undo {
  periods?: PeriodRecord[];
  dayLogs?: DayLog[];
  setup?: Record<string, unknown> | null;
  // The memory notes as they were, when the change touched them.
  notes?: string[];
}

export interface Applied {
  data: Partial<AgentData>;
  undo: Undo;
  saved: SavedItem[];
}

export type Tone = 'worried' | 'sad' | 'tired' | 'happy' | 'neutral';

export type VadState = 'waiting' | 'speech' | 'end';
