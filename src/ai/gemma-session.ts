import type { Intent } from '../core/companion';
import { loadGemma, type NativeGemma } from './gemma-native';
import { pickIntent } from './intent';

// One Gemma 4 context for the whole app: a second copy of the 2.7 GB model would not fit.
let session: Promise<NativeGemma> | null = null;

export function gemmaSession(): Promise<NativeGemma> {
  session ??= loadGemma().catch((error: unknown) => {
    session = null;
    throw error;
  });
  return session;
}

export async function askGemma(text: string): Promise<Record<string, number[]>> {
  const gemma = await gemmaSession();
  return (await gemma.decide(text)).answers;
}

export async function askIntent(text: string): Promise<Intent | null> {
  const gemma = await gemmaSession();
  return pickIntent((await gemma.intent(text)).probs);
}

export async function releaseGemma(): Promise<void> {
  const held = session;
  session = null;
  if (held) await (await held.catch(() => null))?.release();
}

export async function runJson(prompt: string, schema: object, timeoutMs?: number): Promise<unknown> {
  return (await gemmaSession()).json(prompt, schema, { timeoutMs });
}

export async function runSay(...args: Parameters<NativeGemma['say']>): Promise<string> {
  return (await gemmaSession()).say(...args);
}
