import type { DayLog, Mood } from '../types';
import type { Tone } from './types';

// How Liora sounds: bright when her day is light, gentle when it is heavy (comfort wins a mix),
// steady otherwise. It shapes the wording only, never a decision.
export type ReplyStyle = 'bright' | 'gentle' | 'steady';

const HEAVY: readonly Mood[] = ['tired', 'anxious', 'stressed', 'irritable', 'sad'];
const LIGHT: readonly Mood[] = ['calm', 'joyful', 'energetic', 'romantic'];

function byMoods(moods: readonly Mood[]): ReplyStyle | null {
  if (moods.some((m) => HEAVY.includes(m))) return 'gentle';
  if (moods.some((m) => LIGHT.includes(m))) return 'bright';
  return null;
}

// What she says now comes first: a symptom or pain in this message, then the moods in it, then how it
// sounds. Earlier today's log counts only when this message carries none of these: symptoms first.
export function replyStyle(
  moodsToday: readonly Mood[],
  tone: Tone,
  now: { moods?: readonly Mood[]; hurting?: boolean } = {},
  hurtingToday = false,
): ReplyStyle {
  if (now.hurting) return 'gentle';
  const said = byMoods(now.moods ?? []);
  if (said) return said;
  if (tone === 'worried' || tone === 'sad' || tone === 'tired') return 'gentle';
  if (tone === 'happy') return 'bright';
  if (hurtingToday) return 'gentle';
  return byMoods(moodsToday) ?? 'steady';
}

export function moodsOn(dayLogs: readonly DayLog[], day: string): Mood[] {
  return [...(dayLogs.find((d) => d.date === day)?.moods ?? [])];
}
