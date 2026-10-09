import { describe, expect, it } from 'vitest';
import { painTooMuch, severityOnly } from './followon';

describe('severityOnly: a short message that says how bad, but not what', () => {
  it.each(['Sobrang sakit', 'Di ko kaya yung sakit', 'grabe ang sakit', 'it hurts so much', 'lumalala', 'hindi ko na kaya'])('%s', (t) => {
    expect(severityOnly(t)).toBe(true);
  });
  it.each(['masakit ulo ko', 'sobrang sakit ng tiyan ko', 'salamat', 'Niregla ako today', 'ok lang'])('not: %s', (t) => {
    expect(severityOnly(t)).toBe(false);
  });
});

describe('painTooMuch: she says the pain is more than she can bear', () => {
  it.each(['Di ko kaya yung sakit', 'hindi ko na kaya', 'sobrang sakit', 'unbearable pain', "I can't take the pain"])('%s', (t) => {
    expect(painTooMuch(t)).toBe(true);
  });
  it.each(['medyo masakit', 'masakit ulo ko', 'kaya ko naman', 'salamat'])('not: %s', (t) => {
    expect(painTooMuch(t)).toBe(false);
  });
});
