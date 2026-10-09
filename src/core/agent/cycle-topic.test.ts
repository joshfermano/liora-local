import { describe, expect, it } from 'vitest';
import { cycleTopic } from './cycle-topic';

describe('what her cycle question is about', () => {
  it.each([
    ['when is my next ovulation?', 'ovulation'],
    ['kailan ako mag-ovulate?', 'ovulation'],
    ['when am i ovulating', 'ovulation'],
    ['when is my fertile window?', 'fertile'],
    ['gusto kong mabuntis, kailan ako fertile?', 'fertile'],
    ['kailan next period ko?', 'period'],
    ['late na ang regla ko', 'period'],
  ])('"%s" is about %s', (text, topic) => {
    expect(cycleTopic(text)).toBe(topic);
  });
});
