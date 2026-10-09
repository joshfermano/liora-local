import { describe, expect, it } from 'vitest';
import { pickVoice, resolveVoice, womenVoices, type VoiceInfo } from './voice';

const v = (name: string, quality = 'Default', language = 'en-US'): VoiceInfo => ({ identifier: `id.${name}.${quality}.${language}`, name, language, quality });

describe('pickVoice', () => {
  it("prefers a woman's voice over a clearer man's voice", () => {
    expect(pickVoice([v('Aaron', 'Enhanced'), v('Samantha')])).toBe('id.Samantha.Default.en-US');
  });

  it("takes the Enhanced woman's voice when there is one", () => {
    expect(pickVoice([v('Samantha'), v('Ava', 'Enhanced')])).toBe('id.Ava.Enhanced.en-US');
  });

  it('reads names with a quality suffix', () => {
    expect(pickVoice([v('Fred'), v('Ava (Premium)', 'Enhanced')])).toBe('id.Ava (Premium).Enhanced.en-US');
  });

  it('prefers US English among equals and ignores other languages', () => {
    expect(pickVoice([v('Karen', 'Default', 'en-AU'), v('Samantha'), v('Amélie', 'Enhanced', 'fr-CA')])).toBe('id.Samantha.Default.en-US');
  });

  it('lets iOS choose when no English voice is installed', () => {
    expect(pickVoice([v('Amélie', 'Enhanced', 'fr-CA')])).toBeUndefined();
  });
});

describe('womenVoices', () => {
  it("lists only English women's voices, best first", () => {
    const list = womenVoices([v('Aaron', 'Enhanced'), v('Samantha'), v('Ava', 'Enhanced'), v('Karen', 'Default', 'en-AU'), v('Amélie', 'Enhanced', 'fr-CA')]);
    expect(list.map((x) => x.name)).toEqual(['Ava', 'Samantha', 'Karen']);
  });
});

describe('resolveVoice', () => {
  const installed = [v('Samantha'), v('Ava', 'Enhanced')];

  it('uses the voice she chose while it is installed', () => {
    expect(resolveVoice(installed, 'id.Samantha.Default.en-US')).toBe('id.Samantha.Default.en-US');
  });

  it('falls back to the automatic pick when her voice was removed', () => {
    expect(resolveVoice(installed, 'id.Zoe.Enhanced.en-US')).toBe('id.Ava.Enhanced.en-US');
  });

  it('picks automatically when she has not chosen', () => {
    expect(resolveVoice(installed, undefined)).toBe('id.Ava.Enhanced.en-US');
  });
});

