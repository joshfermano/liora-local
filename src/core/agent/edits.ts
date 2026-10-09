import type { AgentAction, Screen } from './types';
import { dateWord } from './when';

// Input patterns only: how she asks to delete, clear, undo, look up or open something.
const UNDO = /\bundo\b|i-?undo|bawiin|ibalik/i;
const DELETE = /\b(?:remove|delete|erase|clear)\b|\b(?:i-?)?(?:alisin|burahin|tanggalin|bura)\b/i;
const PERIOD = /regla|\bmens\b|\bperiods?\b|dalaw/i;
// "this month" or "all" turns one deletion into every period in that span.
const SPAN_MONTH = /this\s+month|ngayong\s+buwan|sa\s+buwang?\s+ito|buwan\s+na\s+ito/i;
const SPAN_ALL = /\ball\b|\blahat\b|\bevery\b/i;
const PARTS: { pattern: RegExp; what: Extract<AgentAction, { tool: 'clear_day' }>['what'] }[] = [
  { pattern: /sintomas|symptoms?/i, what: 'symptoms' },
  { pattern: /\bmoods?\b|pakiramdam/i, what: 'moods' },
  { pattern: /aktibidad|activit(?:y|ies)/i, what: 'activities' },
  { pattern: /\bflow\b|daloy/i, what: 'flow' },
];
const LOGGED = /nilog|na-?log|\blogs?\b|\blogged\b|\bentry\b|\bentries\b|lahat|everything/i;
const ASK_DAY = /\b(?:ano|anong)\b.*\b(?:nilog|na-?log|naitala)\b|\bwhat\b.*\b(?:did\s+i\s+log|i\s+logged|logged|my\s+log)\b/i;
const OPEN_VERB = /\b(?:open|buksan|pumunta|punta|go\s+to|show|ipakita)\b/i;
const SCREENS: { pattern: RegExp; screen: Screen }[] = [
  { pattern: /calendar|kalendaryo/i, screen: 'calendar' },
  { pattern: /mood\s*check|mood\s*test|\bepds\b/i, screen: 'mood_check' },
  { pattern: /check-?\s?list/i, screen: 'checklist' },
  { pattern: /\bprofile\b/i, screen: 'profile' },
];
const LOG_DAY = /\blog\s+(?:my\s+)?day\b/i;

export const THANKS = /\b(?:thank\s*you|thanks|salamat)\b/i;

// An edit request stands alone: it never also logs a period, symptom or mood.
export function readEdit(text: string, today: string): AgentAction[] | null {
  const now = { kind: 'today' } as const;
  if (UNDO.test(text)) return [{ tool: 'undo_last' }];
  if (ASK_DAY.test(text)) return [{ tool: 'ask_day', date: dateWord(text, now, today) }];
  if (DELETE.test(text)) {
    const part = PERIOD.test(text) ? undefined : PARTS.find((p) => p.pattern.test(text));
    if (part) return [{ tool: 'clear_day', date: dateWord(text, now, today), what: part.what }];
    if (PERIOD.test(text)) {
      if (SPAN_MONTH.test(text)) return [{ tool: 'delete_period', date: now, span: 'month' }];
      if (SPAN_ALL.test(text)) return [{ tool: 'delete_period', date: now, span: 'all' }];
      return [{ tool: 'delete_period', date: dateWord(text, { kind: 'unknown' }, today) }];
    }
    if (LOGGED.test(text)) return [{ tool: 'clear_day', date: dateWord(text, now, today), what: 'all' }];
  }
  if (OPEN_VERB.test(text)) {
    const screen = SCREENS.find((s) => s.pattern.test(text));
    if (screen) return [{ tool: 'open', screen: screen.screen }];
  }
  if (LOG_DAY.test(text)) return [{ tool: 'open', screen: 'log_day' }];
  return null;
}
