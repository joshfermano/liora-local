import { describe, expect, it } from 'vitest';
import { withoutGreeting } from './greeting';

describe('withoutGreeting: later turns go straight to the answer', () => {
  it.each([
    ['Hi Gweny! You logged cramps today.', 'You logged cramps today.'],
    ['Hello, Gweny. Your next period is around Nov 7.', 'Your next period is around Nov 7.'],
    ['Kumusta, Gweny! Na-save ko na.', 'Na-save ko na.'],
    ['Magandang umaga! Nandito ako.', 'Nandito ako.'],
    ['Hey there, you logged calm today.', 'You logged calm today.'],
    ['Gweny, you logged calm today.', 'You logged calm today.'],
  ])('%s', (text, expected) => {
    expect(withoutGreeting(text, 'Gweny')).toBe(expected);
  });

  it('leaves a reply that does not open with a greeting alone', () => {
    expect(withoutGreeting('You logged calm today, Gweny.', 'Gweny')).toBe('You logged calm today, Gweny.');
    expect(withoutGreeting('Higit sa lahat, nandito ako.', 'Gweny')).toBe('Higit sa lahat, nandito ako.');
  });

  it('gives null when the reply was only a greeting', () => {
    expect(withoutGreeting('Hi Gweny!', 'Gweny')).toBeNull();
  });
});
