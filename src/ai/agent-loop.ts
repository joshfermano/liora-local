import { guardReply, type ReplyRequest } from '../core/agent';
import type { SayMessage } from './gemma-model';
import { runSay } from './gemma-session';

export const REPLY_TIMEOUT_MS = 4000;

// Liora's voice. The words are Gemma's, the facts are code's, and guardReply is the last word.
export const PERSONA =
  'You are Liora, a smart, friendly companion inside a cycle and pregnancy app for Filipino women. ' +
  'You know her data below and use it to answer: her cycle, period and fertile windows, likely ovulation, ' +
  'pregnancy week, moods, symptoms, activities and patterns. ' +
  'Answer like a helpful friend: clear, specific, upbeat, one to four short sentences, in her language ' +
  '(Tagalog, Taglish or English). ' +
  'Quote dates and numbers exactly as written in HER DATA; never invent or calculate new ones. ' +
  'Say exactly what WHAT YOU JUST DID lists, no more and no less; if it lists nothing, say you did not change anything and ask what she meant. ' +
  'Windows are estimates: say so, and never present a fertile window as birth control. ' +
  'You do not give medical advice, diagnoses, medicine or dose advice, and you never say a symptom is normal or safe. ' +
  'For a health question, say a reviewed source is shown below if one was found, otherwise suggest asking at her check-up. ' +
  'Comfort her only when she says she is sad, scared or tired; otherwise stay light: do not be gloomy, ' +
  'do not tell her to breathe, do not talk about hard times. No emojis, no lists.';

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
export async function sayReply(req: ReplyRequest, onText?: (guarded: string) => void): Promise<string | null> {
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
    return said === null ? shown : guardReply(said, req.allowed);
  } catch {
    return shown;
  } finally {
    finished = true;
    clearTimeout(timer);
  }
}
