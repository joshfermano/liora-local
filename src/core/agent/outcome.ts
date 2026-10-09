import { addDays, format, parseISO } from 'date-fns';
import { THANKS } from './edits';
import type { AgentData, Facts, SavedItem, Screen, Tone } from './types';

// What an agent turn did, as plain data. The responder (Gemma) may only word these facts; the
// fallback is the fixed `reply.*` line used when it has no safe words.
export interface Outcome {
  saved: SavedItem[];
  // A confirm block waits for her tap.
  waiting: boolean;
  // What undo put back; null when she did not ask for undo.
  undid: SavedItem[] | null;
  nothingToUndo: boolean;
  // She asked to delete or clear something that is not there.
  notFound: boolean;
  // She asked Liora to forget a note it does not have.
  noteNotFound?: boolean;
  cycle: { facts: Facts; textKey: string | null } | null;
  day: { date: string; facts: Facts; hasData: boolean } | null;
  // null when she did not ask a health question.
  card: boolean | null;
  opened: Screen | null;
  smalltalk: 'greeting' | 'thanks' | null;
  // She asked about her own data; Gemma answers from the data it was given.
  asksAboutHerData: boolean;
}

export interface Fallback {
  key: string;
  params?: Record<string, string>;
}

export interface Turn {
  role: 'her' | 'liora';
  text: string;
}

// Everything the responder is given for one reply.
export interface ReplyRequest {
  text: string;
  // Plain-English profile of her data.
  pack: string;
  // What the tools just did.
  facts: Facts;
  // Every value a sentence may quote: her data plus the tool facts.
  allowed: Facts;
  thread: Turn[];
}

const GREETING = /^\s*(?:hi+|hello|hey+|hiya|kumusta|kamusta|musta|good\s+(?:morning|afternoon|evening|day)|magandang\s+\w+)\b/i;

export function smalltalkKind(text: string): 'greeting' | 'thanks' | null {
  if (THANKS.test(text)) return 'thanks';
  return GREETING.test(text) ? 'greeting' : null;
}

export function dayHasData(data: AgentData, date: string): boolean {
  const log = data.dayLogs.find((l) => l.date === date);
  const logged = !!log && (log.flow !== null || log.symptoms.length > 0 || log.moods.length > 0 || log.activities.length > 0 || !!log.note);
  return logged || data.periods.some((p) => p.start <= date && date <= (p.end ?? p.start));
}

const words = (code: string) => code.replace(/_/g, ' ');
const isRemoval = (i: SavedItem) => i.kind === 'period_deleted' || i.kind === 'day_cleared' || i.kind === 'forgot';

function dayLabel(date: string, today: string): string {
  if (date === today) return 'today';
  if (date === format(addDays(parseISO(today), -1), 'yyyy-MM-dd')) return 'yesterday';
  return format(parseISO(date), 'MMM d');
}

function factLine(item: SavedItem, today: string): string {
  const when = (date: string) => dayLabel(date, today);
  switch (item.kind) {
    case 'period_start':
      return item.end ? `period logged from ${when(item.date)} to ${when(item.end)}` : `period start logged for ${when(item.date)}`;
    case 'period_end':
      return `period end logged for ${when(item.date)}`;
    case 'flow':
      return `${item.flow} flow logged for ${when(item.date)}`;
    case 'symptoms':
      return `symptoms logged for ${when(item.date)}: ${item.values.map(words).join(', ')}`;
    case 'moods':
      return `moods logged for ${when(item.date)}: ${item.values.map(words).join(', ')}`;
    case 'activities':
      return `activities logged for ${when(item.date)}: ${item.values.map(words).join(', ')}`;
    case 'weeks':
      return `set to ${item.weeks} weeks pregnant`;
    case 'status':
      return item.status === 'neither' ? 'profile updated: not pregnant' : `profile updated: ${item.status}`;
    case 'period_deleted':
      return item.end ? `removed the period from ${when(item.date)} to ${when(item.end)}` : `removed the period that started ${when(item.date)}`;
    case 'day_cleared':
      return `cleared ${item.what === 'all' ? 'everything' : `the ${item.what}`} logged for ${when(item.date)}`;
    case 'remembered':
      return `will remember: "${item.note}"`;
    case 'forgot':
      return item.note ? `forgot: "${item.note}"` : 'forgot everything she asked me to remember';
  }
}

const HELP = [
  'log her period, flow, symptoms, moods and activities',
  'remove a logged period or clear a day, and undo the last change',
  'say what she logged on a day',
  'tell her about her cycle and what her data shows',
  'show a reviewed source card for a health question',
  'open the calendar, mood check, checklist, profile or day log',
  'remember a short note she asks for, and forget it again',
];

const TONE_WORD: Partial<Record<Tone, string>> = { worried: 'scared', sad: 'sad', tired: 'tired' };

function fallbackOf(o: Outcome, name: string | undefined): Fallback {
  if (o.saved.length > 0) {
    if (o.saved.every((i) => i.kind === 'remembered')) return { key: 'reply.remembered' };
    return { key: o.saved.every(isRemoval) ? 'reply.deleted' : 'reply.saved' };
  }
  if (o.undid) return { key: 'reply.undone' };
  if (o.nothingToUndo) return { key: 'reply.nothing_to_undo' };
  if (o.notFound) return { key: 'reply.not_found' };
  if (o.noteNotFound) return { key: 'reply.note_not_found' };
  if (o.waiting) return { key: 'reply.confirm' };
  if (o.day) return { key: o.day.hasData ? 'reply.day' : 'reply.day_empty' };
  if (o.cycle) return { key: o.cycle.textKey ?? 'reply.cycle' };
  if (o.card !== null) return { key: o.card ? 'reply.card' : 'reply.no_card' };
  if (o.opened) return { key: 'reply.open' };
  if (o.smalltalk === 'thanks') return { key: 'reply.thanks' };
  if (o.smalltalk === 'greeting') return name ? { key: 'reply.greeting', params: { name } } : { key: 'reply.greeting.anon' };
  return { key: 'reply.other' };
}

export function replyPlan(o: Outcome, who: { name?: string; tone: Tone; today: string }): { facts: Facts; fallback: Fallback } {
  const facts: Facts = {};
  if (who.name) facts.her_name = who.name;
  const tone = TONE_WORD[who.tone];
  if (tone) facts.her_tone = tone;

  const writes = o.saved.filter((i) => !isRemoval(i));
  const removals = o.saved.filter(isRemoval);
  if (writes.length > 0) facts.saved = writes.map((i) => factLine(i, who.today));
  if (removals.length > 0) facts.removed = removals.map((i) => factLine(i, who.today));
  if (o.undid) facts.undone = o.undid.map((i) => factLine(i, who.today));
  if (o.nothingToUndo) facts.nothing_to_undo = true;
  if (o.notFound) facts.could_not_find_it_on_her_calendar = true;
  if (o.noteNotFound) facts.could_not_find_that_note = true;
  if (o.waiting) facts.waiting_for_her_tap_to_save = true;
  if (o.day) {
    facts.day = dayLabel(o.day.date, who.today);
    facts.anything_logged_that_day = o.day.hasData;
    Object.assign(facts, o.day.facts);
  }
  if (o.cycle) Object.assign(facts, o.cycle.facts);
  if (o.card !== null) facts.source_card = o.card ? 'found, shown below your message' : 'none found';
  if (o.opened) facts.opened = words(o.opened);
  if (o.smalltalk) facts.she_said = o.smalltalk === 'thanks' ? 'thank you' : 'hello';
  if (o.asksAboutHerData) facts.she_asked_about_her_own_data = true;

  const acted = Object.keys(facts).some((k) => k !== 'her_name' && k !== 'her_tone');
  if (!acted) {
    facts.no_action_taken = true;
    facts.i_can_help_with = HELP;
  }
  return { facts, fallback: fallbackOf(o, who.name) };
}
