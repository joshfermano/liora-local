import { describe, expect, it } from 'vitest';
import { mentionsLoss } from './loss';

describe('words for losing a pregnancy', () => {
  it.each(['nakunan ako', 'I had a miscarriage', 'nakunan ako kahapon', 'we lost our baby'])('hears "%s"', (text) => {
    expect(mentionsLoss(text)).toBe(true);
  });

  it.each(['paano maiiwasan ang nakunan?', 'what are signs of miscarriage', 'masakit ulo ko'])('leaves "%s" alone', (text) => {
    expect(mentionsLoss(text)).toBe(false);
  });
});
