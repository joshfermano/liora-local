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

// One call at a time: the context runs one completion, and a second call while one runs fails at once
// with "Context is busy". A call waits its turn instead, and a call that timed out holds the turn until
// the model has really stopped.
let lane: Promise<unknown> = Promise.resolve();
function inTurn<T>(job: () => Promise<T>): Promise<T> {
  const run = lane.then(job, job);
  lane = run.catch(() => {});
  return run;
}

export async function askGemma(text: string): Promise<Record<string, number[]>> {
  const gemma = await gemmaSession();
  return (await inTurn(() => gemma.decide(text))).answers;
}

export async function askIntent(text: string): Promise<Intent | null> {
  const gemma = await gemmaSession();
  return pickIntent((await inTurn(() => gemma.intent(text))).probs);
}

export async function releaseGemma(): Promise<void> {
  const held = session;
  session = null;
  if (held) await (await held.catch(() => null))?.release();
}

export async function runJson(prompt: string, schema: object, timeoutMs?: number): Promise<unknown> {
  const gemma = await gemmaSession();
  return inTurn(() => gemma.json(prompt, schema, { timeoutMs }));
}

export async function runSay(...args: Parameters<NativeGemma['say']>): Promise<string> {
  const gemma = await gemmaSession();
  return inTurn(() => gemma.say(...args));
}

export async function runTranscribe(wavUri: string): Promise<{ text: string; ms: number }> {
  const gemma = await gemmaSession();
  return inTurn(() => gemma.transcribe(wavUri));
}
