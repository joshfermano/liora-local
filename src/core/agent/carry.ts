import { readText } from '../lexicon';
import { resolveDate } from './dates';
import { readActions } from './read';
import { WRITE_TOOLS, type AgentAction, type DateWord, type SavedItem } from './types';
import { dateWord } from './when';

// Short replies that only make sense after what Liora just saved: "pati kahapon", "kahapon pala",
// "tapos na", "burahin mo". Input patterns only.
const AGAIN = /\b(?:pati|din|rin|too|also|same|ganun\s+din|ganoon\s+din|as\s+well)\b/i;
const MOVE = /\b(?:pala|mali|actually|i\s+meant|wrong|sorry)\b|^\s*(?:no|hindi|di)\b/i;
const ENDED = /\b(?:natapos|tapos\s+na|ended|stopped|huminto|tumigil|wala\s+na)\b/i;
const UNDO =
  /^\s*(?:burahin|tanggalin|alisin|i-?delete|delete|remove|undo|cancel|bawiin|ibalik)(?:\s+(?:mo|na|po|that|it|yan|iyan|yun|iyon|lang|nalang|please))*[\s.!]*$/i;
const SHORT = 8;
const AGAIN_PERIOD = /\b(?:nagsimula|niregla|nagka-?regla|dumating|started|came|got\s+it)\s+(?:na\s+)?(?:ulit|uli|again)\b/i;

const at = (date: string): DateWord => ({ kind: 'date', date });

function again(item: SavedItem, date: string): AgentAction | null {
  switch (item.kind) {
    case 'symptoms':
      return { tool: 'symptoms', date: at(date), symptoms: item.values };
    case 'moods':
      return { tool: 'moods', date: at(date), moods: item.values };
    case 'activities':
      return { tool: 'activities', date: at(date), activities: item.values };
    case 'discharge':
      return { tool: 'discharge', date: at(date), discharge: item.discharge };
    case 'flow':
      return { tool: 'flow', date: at(date), flow: item.flow };
    default:
      return null;
  }
}

function moved(item: SavedItem, date: string): AgentAction | null {
  if (item.kind === 'period_start') return { tool: 'period_start', date: at(date), flow: null };
  if (item.kind === 'period_end') return { tool: 'period_end', date: at(date) };
  return again(item, date);
}

const BARE_DATE = /^\s*(?:(?:noong|nung|last|since|mula|simula)\s+)?(?:kahapon|yesterday|ngayon|today|kanina|kaninang\s+umaga|this\s+morning|\d+\s+(?:days?|araw)\s+(?:ago|na(?:ng)?\s+nakaraan|na)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\w*\.?\s+\d{1,2}|\d{4}-\d{2}-\d{2})(?:\s+(?:po|lang|pa))*[\s.!]*$/i;

// "Kahapon" right after Liora asked which day: the logs she was waiting on, now with that date.
export function dateAnswer(text: string, waiting: AgentAction[], today: string): AgentAction[] | null {
  if (waiting.length === 0 || !BARE_DATE.test(text)) return null;
  const date = resolveDate(dateWord(text, { kind: 'unknown' }, today), today);
  if (!date) return null;
  const filled = waiting.map((a) => ('date' in a && a.date.kind === 'unknown' ? { ...a, date: at(date) } : a));
  return filled.some((a, i) => a !== waiting[i]) ? filled : null;
}

// What a short follow-on means, given the items Liora saved in her last reply; null when it means nothing.
export function carryOver(text: string, last: SavedItem[], today: string): AgentAction[] | null {
  if (last.length === 0 || text.trim().split(/\s+/).length > SHORT || text.includes('?')) return null;
  if (readText(text).length > 0) return null;
  // "Masaya din ako kahapon" carries its own log: that is what she means, not the last one again.
  if (readActions(text, today).some((a) => (WRITE_TOOLS as readonly string[]).includes(a.tool))) return null;
  if (UNDO.test(text)) return [{ tool: 'undo_last' }];
  const word = dateWord(text, { kind: 'unknown' }, today);
  const date = resolveDate(word, today);
  if (ENDED.test(text) && last.some((i) => i.kind === 'period_start' || i.kind === 'flow')) {
    // No day named: Liora asks which, as everywhere else; it never guesses a date.
    return [{ tool: 'period_end', date: date ? at(date) : { kind: 'unknown' } }];
  }
  if (AGAIN_PERIOD.test(text) && last.some((i) => i.kind === 'period_start')) {
    return [{ tool: 'period_start', date: date ? at(date) : { kind: 'unknown' }, flow: null }];
  }
  if (!date) return null;
  if (MOVE.test(text)) {
    const actions = last.map((i) => moved(i, date)).filter((a): a is AgentAction => a !== null);
    return actions.length > 0 ? [{ tool: 'undo_last' }, ...actions] : null;
  }
  if (AGAIN.test(text)) {
    const loggable = last.map((i) => again(i, i.kind === 'period_start' ? '' : date)).filter((a): a is AgentAction => a !== null);
    const actions = last.filter((i) => !('date' in i) || i.date !== date).map((i) => again(i, date)).filter((a): a is AgentAction => a !== null);
    // Already in that day's log: an empty list, so Liora can say so instead of saving it twice.
    return actions.length > 0 ? actions : loggable.length > 0 ? [] : null;
  }
  return null;
}

// "Bakit kaya?", "ano pwede kong gawin?": a short question with no subject of its own, about what she
// said just before.
const FOLLOW_Q =
  /^\s*(?:bakit(?:\s+(?:kaya|po|ganun|ganoon))?|why(?:\s+is\s+that)?|paano(?:\s+(?:po|yan|yun))?|how\s+come|ano(?:ng)?\s+(?:pwede|puwede|dapat|gagawin)\b.*|what\s+(?:can|should|do)\s+i\s+do\b.*|normal\s+(?:ba|lang\s+ba)(?:\s+(?:yun|yan|iyon|iyan|po))?|is\s+(?:that|it|this)\s+(?:normal|bad|dangerous|okay|ok)|delikado\s+ba(?:\s+(?:yun|yan|po))?|dapat\s+ba\s+(?:akong|ako)\s+(?:mag-?alala|mabahala)|should\s+i\s+(?:worry|be\s+worried))[\s?.!]*$/i;

export function continuesTopic(text: string): boolean {
  return FOLLOW_Q.test(text) && readText(text).length === 0;
}

// "Hindi pala, malungkot ako": she takes back what Liora just saved and says what is true instead.
const CORRECTION = /^\s*(?:hindi\s+pala|di\s+pala|mali(?:\s+pala)?|actually|i\s+mean|i\s+meant|no\s*,|wait\s*,?\s*no|ay\s+hindi|ay\s+mali)\b/i;

export function corrects(text: string, last: SavedItem[]): boolean {
  return last.length > 0 && CORRECTION.test(text);
}

// A bare answer to "Shall I save this?", typed instead of swiped.
const CONFIRM_YES =
  /^\s*(?:oo|opo|oo\s+po|yes|yep|yup|yeah|sige|ok(?:ay)?|okie|go|sure|tama|correct|confirm|save(?:\s+it)?|i-?save(?:\s+mo)?)(?:\s+(?:po|na|lang|please|mo|it))*[\s.!]*$/i;
const CONFIRM_NO = /^\s*(?:hindi|huwag|wag|no|nope|cancel|skip|ayoko|mali|not\s+now|hindi\s+na|huwag\s+na|wag\s+na)(?:\s+(?:po|na|lang|please|muna))*[\s.!]*$/i;

export function confirmAnswer(text: string): 'yes' | 'no' | null {
  if (CONFIRM_YES.test(text)) return 'yes';
  if (CONFIRM_NO.test(text)) return 'no';
  return null;
}

const undated = (a: AgentAction) => 'date' in a && a.date.kind === 'unknown';

// A confirm whose day she has not said: saving it needs the day first.
export function needsDate(actions: AgentAction[]): boolean {
  return actions.some(undated);
}

export function withDate(actions: AgentAction[], date: string): AgentAction[] {
  return actions.map((a) => (undated(a) ? ({ ...a, date: at(date) } as AgentAction) : a));
}

// "Do it then", "sige na", "go ahead": she wants what she asked for just before.
const GO_AHEAD =
  /^\s*(?:(?:ok(?:ay)?|sige|oo|yes|yeah|sure|please|go)[,!.\s]+)?(?:do\s+it|do\s+that|go\s+ahead|go\s+for\s+it|please\s+do|yes\s+please|sige\s+na|gawin\s+mo(?:\s+na)?|i-?check\s+mo(?:\s+na)?|check\s+it|tingnan\s+mo(?:\s+na)?|ituloy\s+mo|proceed)(?:\s+(?:then|na|po|please|now|naman))*[\s.!]*$/i;

export function goAhead(text: string): boolean {
  return GO_AHEAD.test(text);
}
