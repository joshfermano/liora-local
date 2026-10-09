import { predictNext } from '../cycle';
import { readMoods } from '../lexicon';
import type { Context, CycleSettings, Decision, Entry, Extraction, Mood, PeriodRecord, Prediction } from '../types';
import { DANGER_CODES } from '../vocabulary';

// The companion never writes medical text: every reply is fixed copy, her own data, a quoted card
// or the rules' decision. What she meant only chooses which of those to show.
export type Intent = 'symptom' | 'period' | 'mood' | 'cycle_question' | 'health_question' | 'greeting' | 'other';
export type QuickAction = 'checklist' | 'mood_check' | 'calendar' | 'log_period';

export type ReplyBlock =
  | { kind: 'text'; key: string; params?: Record<string, string> }
  | { kind: 'decision'; entryId: string; level: Decision['level'] }
  | { kind: 'period_confirm'; period: NonNullable<Extraction['period']>; date: string | null }
  | { kind: 'mood_noted'; moods: Mood[] }
  | { kind: 'cycle_answer'; prediction: Prediction; lastStart: string }
  | { kind: 'card'; cardId: string }
  | { kind: 'actions'; items: QuickAction[] };

const isDanger = (code: string) => (DANGER_CODES as readonly string[]).includes(code);
const CYCLE_QUESTION = /\b(?:kailan|when)\b.*\b(?:regla|period|mens|dalaw)\b|\bnext\s+period\b|\b(?:cycle|siklo)\b/i;
const GREETING = /^\s*(?:hi|hello|hey|kumusta|kamusta|good\s+(?:morning|afternoon|evening)|salamat|thank)/i;
const QUESTION = /\?|^\s*(?:ano|paano|bakit|pwede|puwede|normal\s+ba|okay\s+lang\s+ba|is\s+it|can\s+i|what|why|how)\b/i;

export function ruleIntent(text: string, entry: Entry): Intent {
  if (entry.findings.some((f) => isDanger(f.code))) return 'symptom';
  // "Kailan next period ko?" mentions a period but asks about the next one.
  if (CYCLE_QUESTION.test(text) && QUESTION.test(text)) return 'cycle_question';
  if (entry.extraction?.period) return 'period';
  if (readMoods(text).length > 0) return 'mood';
  if (GREETING.test(text)) return 'greeting';
  if (QUESTION.test(text)) return 'health_question';
  if (entry.findings.length > 0) return 'symptom';
  return 'other';
}

export interface ReplyInput {
  intent: Intent;
  entry: Entry;
  context: Context;
  periods: PeriodRecord[];
  cycleSettings: CycleSettings;
  today: string;
  cardId: string | null;
  name?: string;
}

export function composeReply({ intent, entry, context, periods, cycleSettings, today, cardId, name }: ReplyInput): ReplyBlock[] {
  const level = entry.decision.level;
  // Safety first: a danger sign or an unclear severity always shows the rules' decision.
  if (level === 'go_now' || level === 'follow_up') {
    return [{ kind: 'text', key: `companion.symptom.${level}` }, { kind: 'decision', entryId: entry.id, level }];
  }
  switch (intent) {
    case 'symptom':
      return [{ kind: 'text', key: 'companion.symptom.ok' }, { kind: 'decision', entryId: entry.id, level }];
    case 'period': {
      const period = entry.extraction?.period;
      if (!period) return [{ kind: 'text', key: 'companion.period.when' }, { kind: 'actions', items: ['log_period'] }];
      return [{ kind: 'text', key: 'companion.period.heard' }, { kind: 'period_confirm', period, date: period.date }];
    }
    case 'mood':
      return [
        { kind: 'text', key: 'companion.mood.noted' },
        { kind: 'mood_noted', moods: readMoods(entry.text) },
        { kind: 'actions', items: ['mood_check'] },
      ];
    case 'cycle_question': {
      if (context.status !== 'neither') return [{ kind: 'text', key: `companion.cycle.${context.status}` }];
      const prediction = predictNext(periods, cycleSettings, today, context.status);
      const lastStart = periods.map((p) => p.start).sort().at(-1);
      if (!prediction || !lastStart) {
        return [{ kind: 'text', key: 'companion.cycle.no_data' }, { kind: 'actions', items: ['log_period', 'calendar'] }];
      }
      return [{ kind: 'cycle_answer', prediction, lastStart }];
    }
    case 'health_question':
      return cardId
        ? [{ kind: 'text', key: 'companion.health.card' }, { kind: 'card', cardId }]
        : [{ kind: 'text', key: 'companion.health.ask' }, { kind: 'actions', items: ['checklist'] }];
    case 'greeting':
      return [
        name ? { kind: 'text', key: 'companion.greeting', params: { name } } : { kind: 'text', key: 'companion.greeting.anon' },
        { kind: 'actions', items: ['checklist', 'mood_check', 'calendar'] },
      ];
    default:
      return [{ kind: 'text', key: 'companion.other' }, { kind: 'actions', items: ['checklist', 'mood_check', 'calendar'] }];
  }
}
