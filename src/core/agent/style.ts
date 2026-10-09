import type { DayLog, Mood } from '../types';
import type { Tone } from './types';

// How Liora sounds: bright when her day is light, gentle when it is heavy (comfort wins a mix),
// steady otherwise. It shapes the wording only, never a decision.
export type ReplyStyle = 'bright' | 'gentle' | 'steady';

const HEAVY: readonly Mood[] = ['tired', 'anxious', 'stressed', 'irritable', 'sad'];
const LIGHT: readonly Mood[] = ['calm', 'joyful', 'energetic', 'romantic'];

export function replyStyle(moodsToday: readonly Mood[], tone: Tone): ReplyStyle {
  if (moodsToday.some((m) => HEAVY.includes(m))) return 'gentle';
  if (moodsToday.some((m) => LIGHT.includes(m))) return 'bright';
  if (tone === 'worried' || tone === 'sad' || tone === 'tired') return 'gentle';
  if (tone === 'happy') return 'bright';
  return 'steady';
}

export function moodsOn(dayLogs: readonly DayLog[], day: string): Mood[] {
  return [...(dayLogs.find((d) => d.date === day)?.moods ?? [])];
}
