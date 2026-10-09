import { describe, expect, it } from 'vitest';
import { languageOf } from './language';

describe('languageOf', () => {
  it('is english for english messages', () => {
    expect(languageOf(['I have a headache today', 'When is my next period?'])).toBe('english');
  });

  it('is tagalog for tagalog messages', () => {
    expect(languageOf(['masakit ang puson ko', 'hindi ako makatulog kasi pagod na ako'])).toBe('tagalog');
  });

  it('is taglish for a mix', () => {
    expect(languageOf(['Niregla ako today', 'masakit ang puson ko pero I walked pa rin'])).toBe('taglish');
    expect(languageOf(['Niregla ako today'])).toBe('taglish');
  });

  it('defaults to english when there is nothing to read', () => {
    expect(languageOf([])).toBe('english');
    expect(languageOf(['??', '123'])).toBe('english');
  });

  it('reads only her last 10 messages', () => {
    const old = Array.from({ length: 10 }, () => 'hindi ako makatulog kasi pagod na ako');
    const recent = Array.from({ length: 10 }, () => 'I am so tired and I have a headache');
    expect(languageOf([...old, ...recent])).toBe('english');
  });

  it('ignores case and punctuation', () => {
    expect(languageOf(['MASAKIT, ANG PUSON KO!!'])).toBe('tagalog');
  });
});
