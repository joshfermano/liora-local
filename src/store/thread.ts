import { en } from '../content/copy';
import type { Turn } from '../core/agent';
import type { ReplyBlock } from '../core/companion';

const TURNS = 6;
const TURN_CHARS = 160;

type ThreadLike = { role: 'her' | 'liora'; text?: string; blocks?: ReplyBlock[]; at?: string };

// Messages older than this belong to an earlier conversation.
const CONVERSATION_MS = 30 * 60 * 1000;

const fill = (s: string, v: Record<string, string> = {}) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
const short = (s: string) => (s.length > TURN_CHARS ? `${s.slice(0, TURN_CHARS)}…` : s);

function lioraText(blocks: ReplyBlock[]): string | null {
  const reply = blocks.find((b) => b.kind === 'reply');
  if (reply?.kind === 'reply') return reply.text ?? fill(en(reply.fallback.key), reply.fallback.params);
  const warm = blocks.find((b) => b.kind === 'warm');
  if (warm?.kind === 'warm') return warm.text ?? en(`warm.${warm.tone}`);
  const text = blocks.find((b) => b.kind === 'text');
  return text?.kind === 'text' ? fill(en(text.key), text.params) : null;
}

// What was said before this message in the current conversation, as she saw it.
export function recentTurns(messages: ThreadLike[], now: Date = new Date()): Turn[] {
  const turns: Turn[] = [];
  for (const m of messages) {
    if (m.at && now.getTime() - Date.parse(m.at) > CONVERSATION_MS) continue;
    const text = m.role === 'her' ? m.text : lioraText(m.blocks ?? []);
    if (text?.trim()) turns.push({ role: m.role, text: short(text.trim()) });
  }
  return turns.slice(-TURNS);
}
