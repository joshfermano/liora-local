import { describe, expect, it } from 'vitest';
import { readText } from '../lexicon';
import { seriousForAnyone } from './serious';
import { guardReply } from './reply';

const codes = (t: string) => readText(t).map((f) => f.code);

describe('the word list reads loss of sight and a typo of severe', () => {
  it.each(['I cannot see', "I can't see", 'hindi ako makakita', 'di ako makakita', 'nawalan ako ng paningin'])('%s', (t) => {
    expect(codes(t)).toContain('visual_disturbance');
  });
  it('reads "sever headache" as a severe headache', () => {
    expect(readText('I am having sever headache').find((f) => f.code === 'severe_headache')?.severity).toBe('severe');
  });
});

describe('seriousForAnyone: signs that should not wait, whatever her status', () => {
  it.each(['I am having sever headache and blurry vision', 'I cannot see', 'nangisay ako', 'nawalan ako ng malay', 'sobrang hirap huminga'])(
    '%s',
    (t) => expect(seriousForAnyone(readText(t))).toBe(true),
  );
  it.each(['masakit ulo ko', 'I am vomiting', 'may regla ako', 'nilalagnat ako', 'cramps today'])('not on its own: %s', (t) => {
    expect(seriousForAnyone(readText(t))).toBe(false);
  });
});

describe('guardReply: no promise to note what was not saved', () => {
  it.each(['I will make a note of that.', "I'll note that for you.", 'I will log it.'])('%s', (s) => {
    expect(guardReply(s, { saved: [], no_action_taken: true })).toBeNull();
  });
});
