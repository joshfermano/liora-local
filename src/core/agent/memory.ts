import type { AgentAction, SavedItem } from './types';

// Notes are her own words, kept on the phone to flavour how Liora talks. They never reach the rules.
export const MAX_NOTES = 20;
export const NOTE_CHARS = 120;

const LEAD = '(?:(?:hey\\s+)?liora[,:]?\\s+)?(?:(?:please|pls|po|can\\s+you|could\\s+you|puwede\\s+mo\\s+bang|pwede\\s+mo\\s+bang)\\s+)*';
const LINK = '(?:(?:that|na|yung|about)\\b|[:,])?';
const REMEMBER = new RegExp(`^\\s*${LEAD}(?:remember|tandaan(?:\\s+mo)?)\\b\\s*${LINK}\\s*(.*)$`, 'is');
const FORGET = new RegExp(`^\\s*${LEAD}(?:forget|kalimutan(?:\\s+mo)?)\\b\\s*${LINK}\\s*(.*)$`, 'is');
const EVERYTHING = /^(?:everything|all(?:\s+of\s+it)?|it\s+all|lahat(?:\s+ng\s+\w+)?)$/i;
const STOP = new Set(['that', 'the', 'about', 'and', 'for', 'yung', 'ang', 'mga', 'kay', 'tungkol', 'ako', 'ito', 'you', 'with', 'this']);

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/[\s.!,;:]+$/, '');
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const tokens = (s: string) => (s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((t) => !STOP.has(t));

// Both requests stand alone, like an edit: a note never also logs a symptom, period or mood.
export function readMemory(text: string): AgentAction[] | null {
  const remember = REMEMBER.exec(text);
  if (remember) {
    const note = tidy(remember[1] ?? '').slice(0, NOTE_CHARS).trim();
    return note && !note.includes('?') ? [{ tool: 'remember', note }] : null;
  }
  const forget = FORGET.exec(text);
  if (!forget) return null;
  const note = tidy(forget[1] ?? '');
  if (!note) return [{ tool: 'forget' }];
  if (EVERYTHING.test(note)) return [{ tool: 'forget', all: true }];
  return [{ tool: 'forget', note: note.slice(0, NOTE_CHARS) }];
}

export const isMemory = (a: AgentAction) => a.tool === 'remember' || a.tool === 'forget';
export const withoutMemory = (actions: AgentAction[]): AgentAction[] => actions.filter((a) => !isMemory(a));

function bestMatch(notes: string[], query: string): number {
  const want = tokens(query);
  let best = -1;
  let score = 0;
  notes.forEach((n, i) => {
    const have = new Set(tokens(n));
    const s = want.filter((t) => have.has(t)).length + (n.toLowerCase().includes(query.toLowerCase()) ? want.length + 1 : 0);
    if (s > 0 && s >= score) {
      best = i;
      score = s;
    }
  });
  return best;
}

// Pure: the new notes and the lines for the "Saved" block, or null when nothing changed.
export function applyMemory(actions: AgentAction[], notes: string[]): { notes: string[]; saved: SavedItem[] } | null {
  let cur = notes;
  const saved: SavedItem[] = [];
  for (const a of actions) {
    if (a.tool === 'remember') {
      if (cur.some((n) => same(n, a.note))) continue;
      cur = [...cur, a.note].slice(-MAX_NOTES);
      saved.push({ kind: 'remembered', note: a.note });
    } else if (a.tool === 'forget') {
      if (a.all) {
        if (cur.length === 0) continue;
        cur = [];
        saved.push({ kind: 'forgot', note: null });
        continue;
      }
      const at = a.note ? bestMatch(cur, a.note) : cur.length - 1;
      if (at < 0) continue;
      saved.push({ kind: 'forgot', note: cur[at]! });
      cur = cur.filter((_, i) => i !== at);
    }
  }
  return saved.length > 0 ? { notes: cur, saved } : null;
}
