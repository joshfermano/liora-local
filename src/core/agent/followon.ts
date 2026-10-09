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

const EMOTION =
  /lungkot|malungkot|\bsad\b|umiiyak|naiiyak|\bcrying\b|bigat\s+(?:ng\s+)?(?:pakiramdam|loob|kalooban)|hopeless|overwhelm\w*|depress\w*|natatakot|takot\s+ako|kinakabahan|\bscared\b|\banxious\b|\bstress\w*|pagod\s+na\s+(?:ako\s+)?sa\s+lahat|alagaan\s+(?:si\s+|ang\s+)?(?:baby|anak)|can'?t\s+cope|mag-?isa\s+(?:lang\s+)?ako|\balone\b/i;

// Feelings that are too much ("sobrang lungkot ko, hindi ko kaya"), with no pain in them: a caring
// line, the mood check and her contact, never the pain reply.
// "Sobrang" alone only counts for a low, heavy mood; worry or stress needs "hindi ko kaya" as well.
const LOW =
  /lungkot|malungkot|\bsad\b|umiiyak|naiiyak|\bcrying\b|bigat\s+(?:ng\s+)?(?:pakiramdam|loob|kalooban)|hopeless|overwhelm\w*|depress\w*|mag-?isa\s+(?:lang\s+)?ako|\balone\b/i;

export function heavyHeart(text: string): boolean {
  if (PAIN.test(text)) return false;
  return (CANNOT_BEAR.test(text) && EMOTION.test(text)) || (SEVERE_CUE.test(text) && LOW.test(text));
}

// She says the pain is more than she can bear: a fixed caring line and her contact, never chit-chat.
export function painTooMuch(text: string): boolean {
  if (heavyHeart(text)) return false;
  return CANNOT_BEAR.test(text) || (SEVERE_CUE.test(text) && PAIN.test(text));
}

// A short typed answer to the follow-up Liora just asked ("Sobrang sakit ba?"): the same as tapping a
// swipe-card button. Only a whole short reply counts, so "hindi ako makatulog" is never a "no".
const NO_ANSWER =
  /^\s*(?:(?:hindi|di)(?:\s+(?:naman|po))*(?:\s+(?:masyado|gaano|ganun|ganoon|ganon))?(?:\s+(?:po|lang))?|no|nope|not\s+really|not\s+(?:that|too|so)\s+bad|konti\s+lang|medyo\s+lang|okay\s+lang(?:\s+naman)?)[\s.!]*$/i;
const YES_ANSWER = /^\s*(?:oo|opo|oo\s+po|yes|yup|yeah|oo\s+sobra|sobra|sobra\s+po|grabe|very)[\s.!]*$/i;

const SKIP_ANSWER = /^\s*(?:skip|laktawan|pass|next|ayoko\s+(?:sumagot|sagutin)|i\s+don'?t\s+know|hindi\s+ko\s+alam|di\s+ko\s+alam)[\s.!]*$/i;

export function followUpAnswer(text: string): 'yes' | 'no' | 'skip' | null {
  if (SKIP_ANSWER.test(text)) return 'skip';
  if (NO_ANSWER.test(text)) return 'no';
  if (YES_ANSWER.test(text)) return 'yes';
  return null;
}
