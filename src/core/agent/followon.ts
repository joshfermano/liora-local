import { readText } from '../lexicon';
import { SEVERE_CUE } from '../lexicon/entries';

const PAIN = /\b(?:sakit|masakit|kirot|hapdi|pain|hurts?|hurting|aches?)\b/i;
const WORSE = /\b(?:lumala|lumalala|lumubha|worse|getting\s+worse)\b/i;
const CANNOT_BEAR =
  /(?:hindi|di)\s+ko\s+(?:na\s+)?(?:kaya|matiis)|\bunbearable\b|can'?t\s+(?:take|bear|stand)|too\s+much\s+(?:pain|to\s+bear)/i;

// "Sobrang sakit", "lumalala": how bad, with no body part. It belongs to what she said just before.
// The word list reads a bare "sakit" as pain somewhere; that alone still names no body part.
export function severityOnly(text: string): boolean {
  if (readText(text).some((f) => f.code !== 'severe_pain')) return false;
  return CANNOT_BEAR.test(text) || WORSE.test(text) || ((SEVERE_CUE.test(text) || /\bso\s+much\b/i.test(text)) && PAIN.test(text));
}

// She says the pain is more than she can bear: a fixed caring line and her contact, never chit-chat.
export function painTooMuch(text: string): boolean {
  return CANNOT_BEAR.test(text) || (SEVERE_CUE.test(text) && PAIN.test(text));
}
