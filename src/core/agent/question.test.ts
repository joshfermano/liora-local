import { describe, expect, it } from 'vitest';
import { isQuestion } from './question';

describe('whether she is asking', () => {
  it.each([
    'do i have ovulation',
    'am i ovulating',
    'is my period late',
    'when is my next ovulation?',
    'may regla ba ako ngayon',
    'kailan next period ko',
    'ano nilog ko kahapon',
    'can I eat sushi',
    'Liora, do I have my period',
    'what day of my cycle am i on',
  ])('"%s" asks', (text) => expect(isQuestion(text)).toBe(true));

  it.each(['did yoga today', 'masakit ulo ko', 'nagsimula regla ko ngayon', 'have cramps today', 'do it then', 'thank you', 'is', 'am tired'])(
    '"%s" does not',
    (text) => expect(isQuestion(text)).toBe(false),
  );
});
