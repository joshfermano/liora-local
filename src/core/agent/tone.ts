import { readMoods } from '../lexicon';
import type { Entry } from '../types';
import { DANGER_CODES } from '../vocabulary';
import type { Tone } from './types';

const FEAR = /takot|natatakot|kinakabahan|nag-?aalala|worried|scared|afraid|anxious/i;
const SAD = /malungkot|lungkot|iyak|umiiyak|\bsad\b|crying/i;
const TIRED = /pagod|\btired\b|\bhapo\b|exhaust/i;
const HAPPY = /masaya|\bsaya\b|salamat|\bhappy\b|thank/i;

export function toneOf(text: string, entry: Entry): Tone {
  const codes = entry.findings.map((f) => f.code);
  const moods = [...(entry.extraction?.moods ?? []), ...readMoods(text)];
  if (codes.some((c) => (DANGER_CODES as readonly string[]).includes(c)) || FEAR.test(text)) return 'worried';
  if (moods.includes('sad') || SAD.test(text)) return 'sad';
  const tired = codes.includes('fatigue') || (entry.extraction?.symptoms ?? []).some((s) => s.code === 'fatigue');
  if (tired || moods.includes('tired') || TIRED.test(text)) return 'tired';
  if (moods.includes('joyful') || moods.includes('calm') || HAPPY.test(text)) return 'happy';
  return 'neutral';
}
