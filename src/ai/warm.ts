import { guardWarm, type SavedItem, type Tone } from '../core/agent';
import { runSay } from './gemma-session';

export const WARM_TIMEOUT_MS = 3000;

const PERSONA =
  'You are Liora, a warm, compassionate companion for a Filipino woman who is pregnant or has a new baby. ' +
  'Answer in the language she wrote in: Tagalog, Taglish or English. ' +
  'Write one or two short, kind sentences, at most 25 words. ' +
  'Only comfort her. Never give advice, never name a symptom, a medicine, a number or a date, ' +
  'never say she is or is not fine, and never repeat what the app saved. No lists, no questions.';

const TONES: Record<Tone, string> = {
  worried: 'She sounds worried.',
  sad: 'She sounds sad.',
  tired: 'She sounds tired.',
  happy: 'She sounds happy.',
  neutral: 'She sounds calm.',
};

export interface WarmContext {
  name?: string;
  saved: SavedItem[];
}

export function warmMessages(text: string, tone: Tone, ctx: WarmContext) {
  const notes = [TONES[tone]];
  if (ctx.name) notes.push(`Her name is ${ctx.name}; use it at most once.`);
  if (ctx.saved.length > 0) notes.push('The app already told her what it saved, so do not mention it.');
  return [
    { role: 'system' as const, content: PERSONA },
    { role: 'user' as const, content: `${notes.join(' ')}\n\nHer message: ${text}` },
  ];
}

// A slow answer, a failure or a line the guard rejects all mean null: the screen shows the fixed line.
export async function warmLine(
  text: string,
  tone: Tone,
  ctx: WarmContext,
  onToken?: (text: string) => void,
): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), WARM_TIMEOUT_MS);
  });
  try {
    const said = await Promise.race([
      runSay(warmMessages(text, tone, ctx), { nPredict: 48, temperature: 0.7, timeoutMs: WARM_TIMEOUT_MS, onToken }),
      timeout,
    ]);
    return said === null ? null : guardWarm(said);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
