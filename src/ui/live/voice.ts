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

// A woman's voice first, then the clearer Enhanced quality, then US English; undefined lets iOS pick.
export function pickVoice(voices: VoiceInfo[]): string | undefined {
  const english = voices.filter((v) => v.language.toLowerCase().startsWith('en'));
  const score = (v: VoiceInfo) => (isWoman(v) ? 4 : 0) + (v.quality === 'Enhanced' ? 2 : 0) + (v.language.toLowerCase() === 'en-us' ? 1 : 0);
  return [...english].sort((x, y) => score(y) - score(x))[0]?.identifier;
}
