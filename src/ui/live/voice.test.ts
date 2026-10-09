import { describe, expect, it } from 'vitest';
import { LIORA_VOICES, lioraVoices, pickVoice, resolveVoice, tierOf, type VoiceInfo } from './voice';

// Apple's identifiers carry the quality: com.apple.voice.{compact|enhanced|premium}.en-US.Ava
const v = (name: string, tier: 'compact' | 'enhanced' | 'premium' = 'compact', language = 'en-US'): VoiceInfo => ({
  identifier: `com.apple.voice.${tier}.${language}.${name}`,
  name,
  language,
  quality: tier === 'enhanced' ? 'Enhanced' : 'Default',
});

describe('tierOf', () => {
  it('reads Premium from the identifier, which expo-speech reports as Default', () => {
    expect(tierOf(v('Ava', 'premium'))).toBe(3);
    expect(tierOf(v('Ava', 'enhanced'))).toBe(2);
    expect(tierOf(v('Ava'))).toBe(1);
  });
});

describe('lioraVoices', () => {
  it('offers only Ava and Zoe, in Premium or Enhanced, best first', () => {
    const list = lioraVoices([v('Samantha', 'enhanced'), v('Ava'), v('Zoe', 'enhanced'), v('Ava', 'premium'), v('Aaron', 'premium')]);
    expect(list.map((x) => x.identifier)).toEqual(['com.apple.voice.premium.en-US.Ava', 'com.apple.voice.enhanced.en-US.Zoe']);
  });

  it('is empty when neither is downloaded', () => {
    expect(lioraVoices([v('Samantha'), v('Ava')])).toEqual([]);
  });

  it('names the voices the picker offers', () => {
    expect(LIORA_VOICES).toEqual(['Ava', 'Zoe']);
  });
});

describe('pickVoice', () => {
  it('takes the best Ava or Zoe on the phone', () => {
    expect(pickVoice([v('Samantha', 'enhanced'), v('Zoe', 'enhanced'), v('Ava', 'premium')])).toBe('com.apple.voice.premium.en-US.Ava');
  });

  it("falls back to the clearest woman's voice so Live is never silent", () => {
    expect(pickVoice([v('Aaron', 'enhanced'), v('Samantha')])).toBe('com.apple.voice.compact.en-US.Samantha');
  });

  it('lets iOS choose when no English voice is installed', () => {
    expect(pickVoice([v('Amélie', 'premium', 'fr-CA')])).toBeUndefined();
  });
});

describe('resolveVoice', () => {
  const installed = [v('Samantha'), v('Ava', 'premium'), v('Zoe', 'enhanced')];

  it('uses the voice she chose while it is installed', () => {
    expect(resolveVoice(installed, 'com.apple.voice.enhanced.en-US.Zoe')).toBe('com.apple.voice.enhanced.en-US.Zoe');
  });

  it('falls back to the automatic pick when her voice was removed', () => {
    expect(resolveVoice(installed, 'com.apple.voice.premium.en-US.Zoe')).toBe('com.apple.voice.premium.en-US.Ava');
  });

  it('picks automatically when she has not chosen', () => {
    expect(resolveVoice(installed, undefined)).toBe('com.apple.voice.premium.en-US.Ava');
  });
});
