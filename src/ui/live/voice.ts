// Apple's English voices that speak as a woman. iOS does not label a voice's gender, so names decide.
const WOMEN = new Set([
  'ava', 'samantha', 'allison', 'susan', 'zoe', 'victoria', 'kathy', 'nicky', 'karen', 'moira', 'tessa',
  'serena', 'kate', 'stephanie', 'fiona', 'veena', 'catherine', 'martha', 'isha', 'sandy', 'shelley',
]);

export interface VoiceInfo {
  identifier: string;
  name: string;
  language: string;
  quality: string;
}

const firstName = (v: VoiceInfo) => v.name.toLowerCase().split(/[\s(]/)[0] ?? '';
const isWoman = (v: VoiceInfo) => WOMEN.has(firstName(v));

// expo-speech reports Premium as Default, so the identifier (com.apple.voice.premium.…) decides.
export function tierOf(v: VoiceInfo): 1 | 2 | 3 {
  const id = v.identifier.toLowerCase();
  if (id.includes('premium')) return 3;
  if (id.includes('enhanced') || v.quality === 'Enhanced') return 2;
  return 1;
}

// Premium first (they sound natural), then a woman's voice, then the clearer tier, then US English.
const score = (v: VoiceInfo) =>
  (tierOf(v) === 3 ? 1000 : 0) + (isWoman(v) ? 100 : 0) + tierOf(v) * 10 + (v.language.toLowerCase() === 'en-us' ? 1 : 0);
const english = (voices: VoiceInfo[]) => voices.filter((v) => v.language.toLowerCase().startsWith('en'));
const best = (voices: VoiceInfo[]) => [...voices].sort((x, y) => score(y) - score(x));

// The best Premium voice on the phone; without one, the clearest woman's voice so Live is never silent.
export function pickVoice(voices: VoiceInfo[]): string | undefined {
  return best(english(voices))[0]?.identifier;
}

// The choices shown to her: every downloaded English Premium voice, women first.
export function premiumVoices(voices: VoiceInfo[]): VoiceInfo[] {
  return best(english(voices).filter((v) => tierOf(v) === 3));
}

// Her chosen voice while it is still installed; otherwise the automatic pick.
export function resolveVoice(voices: VoiceInfo[], chosen: string | undefined): string | undefined {
  return chosen && voices.some((v) => v.identifier === chosen) ? chosen : pickVoice(voices);
}
