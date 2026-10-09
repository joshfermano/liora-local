import { describe, expect, it } from 'vitest';
import { DANGER_CODES, SYMPTOMS } from '../core/vocabulary';
import { en, signKey } from './copy';

describe('every code a finding can carry has a readable label', () => {
  it.each([...DANGER_CODES, ...SYMPTOMS])('%s', (code) => {
    expect(en(signKey(code))).not.toMatch(/\[copy:/);
  });
});
