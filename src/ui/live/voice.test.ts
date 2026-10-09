import { describe, expect, it } from 'vitest';
import { premiumVoices, pickVoice, resolveVoice, tierOf, type VoiceInfo } from './voice';

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

describe('premiumVoices', () => {
  it('lists every downloaded English Premium voice, women first', () => {
    const list = premiumVoices([
      v('Samantha', 'enhanced'),
      v('Ava'),
      v('Evan', 'premium'),
      v('Zoe', 'premium'),
      v('Serena', 'premium', 'en-GB'),
      v('Amélie', 'premium', 'fr-CA'),
    ]);
    expect(list.map((x) => x.name)).toEqual(['Zoe', 'Serena', 'Evan']);
  });

  it('is empty when no Premium voice is downloaded', () => {
    expect(premiumVoices([v('Samantha', 'enhanced'), v('Ava')])).toEqual([]);
  });
});

describe('pickVoice', () => {
  it("takes a Premium woman's voice first, then any Premium voice", () => {
    expect(pickVoice([v('Samantha', 'enhanced'), v('Evan', 'premium'), v('Ava', 'premium')])).toBe('com.apple.voice.premium.en-US.Ava');
    expect(pickVoice([v('Samantha', 'enhanced'), v('Evan', 'premium')])).toBe('com.apple.voice.premium.en-US.Evan');
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
