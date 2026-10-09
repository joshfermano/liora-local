import { guardReply, type ReplyRequest } from '../core/agent';
import { noteDropped, notePrompt } from '../core/probe';
import type { SayMessage } from './gemma-model';
import { runSay } from './gemma-session';
import { PROMPTS } from './prompts';

export const REPLY_TIMEOUT_MS = 4000;

export const PERSONA = PROMPTS.persona.text;

export function replyMessages({ text, pack, facts, thread }: ReplyRequest): SayMessage[] {
  const parts: string[] = [];
  if (pack.trim()) parts.push(`HER DATA:\n${pack.trim()}`);
  parts.push(`WHAT YOU JUST DID:\n${JSON.stringify(facts)}`);
  if (thread.length > 0) parts.push(`Recent chat:\n${thread.map((t) => `${t.role === 'her' ? 'Her' : 'Liora'}: ${t.text}`).join('\n')}`);
  parts.push(`Her message: ${text}`);
  return [
    { role: 'system', content: PERSONA },
    { role: 'user', content: parts.join('\n\n') },
  ];
}

// Everything up to the last finished sentence. A stop followed by a digit ("2.5") is not the end of one,
// and neither is a stop at the very end, which more words may still extend.
export function completeSentences(streamed: string): string {
  const stop = /[.!?…]+["')\]]*(?=\s)/g;
  let end = 0;
  for (let m = stop.exec(streamed); m; m = stop.exec(streamed)) end = m.index + m[0].length;
  return streamed.slice(0, end).trim();
}

// Only sentences that passed the guard ever reach onText; a failure or a late answer keeps what already passed.
const sentenceCount = (text: string | null) => (text ? text.split(/(?<=[.!?…])\s+|\n+/).filter((s) => s.trim()).length : 0);

export async function sayReply(req: ReplyRequest, onText?: (guarded: string) => void): Promise<string | null> {
  notePrompt('persona', PROMPTS.persona.version);
  let shown: string | null = null;
  let finished = false;
  let sentences = '';
  const show = (guarded: string | null) => {
    if (finished || !guarded || guarded === shown) return;
    shown = guarded;
    onText?.(guarded);
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), REPLY_TIMEOUT_MS);
  });
  try {
    const said = await Promise.race([
      runSay(replyMessages(req), {
        nPredict: 160,
        temperature: 0.7,
        timeoutMs: REPLY_TIMEOUT_MS,
        onToken: (streamed) => {
          const done = completeSentences(streamed);
          if (done === sentences) return;
          sentences = done;
          show(guardReply(done, req.allowed));
        },
      }),
      timeout,
    ]);
    if (said === null) return shown;
    const guarded = guardReply(said, req.allowed);
    noteDropped(Math.max(0, sentenceCount(said) - sentenceCount(guarded)));
    return guarded;
  } catch {
    return shown;
  } finally {
    finished = true;
    clearTimeout(timer);
  }
}
