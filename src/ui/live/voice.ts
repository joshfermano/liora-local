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

const isWoman = (v: VoiceInfo) => WOMEN.has(v.name.toLowerCase().split(/[\s(]/)[0] ?? '');

const score = (v: VoiceInfo) => (isWoman(v) ? 4 : 0) + (v.quality === 'Enhanced' ? 2 : 0) + (v.language.toLowerCase() === 'en-us' ? 1 : 0);
const english = (voices: VoiceInfo[]) => voices.filter((v) => v.language.toLowerCase().startsWith('en'));

// A woman's voice first, then the clearer Enhanced quality, then US English; undefined lets iOS pick.
export function pickVoice(voices: VoiceInfo[]): string | undefined {
  return [...english(voices)].sort((x, y) => score(y) - score(x))[0]?.identifier;
}

// The choices shown to her: English women's voices only, best first.
export function womenVoices(voices: VoiceInfo[]): VoiceInfo[] {
  return english(voices)
    .filter(isWoman)
    .sort((x, y) => score(y) - score(x));
}

// Her chosen voice while it is still installed; otherwise the automatic pick.
export function resolveVoice(voices: VoiceInfo[], chosen: string | undefined): string | undefined {
  return chosen && voices.some((v) => v.identifier === chosen) ? chosen : pickVoice(voices);
}
