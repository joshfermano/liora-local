// Apple's English voices that speak as a woman. iOS does not label a voice's gender, so names decide.
const WOMEN = new Set([
  'ava', 'samantha', 'allison', 'susan', 'zoe', 'victoria', 'kathy', 'nicky', 'karen', 'moira', 'tessa',
  'serena', 'kate', 'stephanie', 'fiona', 'veena', 'catherine', 'martha', 'isha', 'sandy', 'shelley',
]);

// The natural-sounding voices Liora offers; their compact versions sound robotic, so only Enhanced or Premium count.
export const LIORA_VOICES = ['Ava', 'Zoe'] as const;

export interface VoiceInfo {
  identifier: string;
  name: string;
  language: string;
  quality: string;
}

const firstName = (v: VoiceInfo) => v.name.toLowerCase().split(/[\s(]/)[0] ?? '';
const isWoman = (v: VoiceInfo) => WOMEN.has(firstName(v));
const isLiora = (v: VoiceInfo) => LIORA_VOICES.some((n) => n.toLowerCase() === firstName(v));

// expo-speech reports Premium as Default, so the identifier (com.apple.voice.premium.…) decides.
export function tierOf(v: VoiceInfo): 1 | 2 | 3 {
  const id = v.identifier.toLowerCase();
  if (id.includes('premium')) return 3;
  if (id.includes('enhanced') || v.quality === 'Enhanced') return 2;
  return 1;
}

const score = (v: VoiceInfo) =>
  (isLiora(v) && tierOf(v) >= 2 ? 100 : 0) + (isWoman(v) ? 10 : 0) + tierOf(v) * 2 + (v.language.toLowerCase() === 'en-us' ? 1 : 0);
const english = (voices: VoiceInfo[]) => voices.filter((v) => v.language.toLowerCase().startsWith('en'));
const best = (voices: VoiceInfo[]) => [...voices].sort((x, y) => score(y) - score(x));

// The best Ava or Zoe on the phone; without them, the clearest woman's voice so Live is never silent.
export function pickVoice(voices: VoiceInfo[]): string | undefined {
  return best(english(voices))[0]?.identifier;
}

// The choices shown to her: Ava and Zoe in Premium or Enhanced only, best first.
export function lioraVoices(voices: VoiceInfo[]): VoiceInfo[] {
  return best(english(voices).filter((v) => isLiora(v) && tierOf(v) >= 2));
}

// Her chosen voice while it is still installed; otherwise the automatic pick.
export function resolveVoice(voices: VoiceInfo[], chosen: string | undefined): string | undefined {
  return chosen && voices.some((v) => v.identifier === chosen) ? chosen : pickVoice(voices);
}
