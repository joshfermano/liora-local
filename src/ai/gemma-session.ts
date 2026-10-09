import { loadGemma, type NativeGemma } from './gemma-native';

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

export async function releaseGemma(): Promise<void> {
  const held = session;
  session = null;
  if (held) await (await held.catch(() => null))?.release();
}
