import { describe, expect, it } from 'vitest';
import { contextFrom, readProfile } from './profile';

describe('her profile', () => {
  it('reads the numbers she entered', () => {
    expect(readProfile({ name: 'Ana', age: 28, heightCm: 155, weightKg: 58, status: 'pregnant', weeks: 32 })).toEqual({
      name: 'Ana',
      age: 28,
      heightCm: 155,
      weightKg: 58,
      status: 'pregnant',
      weeks: 32,
      lock: false,
    });
  });

  it('drops values that cannot be right instead of guessing', () => {
    expect(readProfile({ age: 3, heightCm: 900, weightKg: 'heavy', status: 'other', weeks: 60 })).toEqual({ lock: false });
  });

  it('starts empty before setup', () => {
    expect(readProfile(null)).toEqual({ lock: false });
  });

  it('gives the rules her status and weeks only', () => {
    expect(contextFrom({ status: 'pregnant', weeks: 32, age: 28, lock: false })).toEqual({ status: 'pregnant', weeks: 32 });
    expect(contextFrom({ lock: false })).toEqual({ status: 'pregnant' });
  });
});

describe('numbers saved as text', () => {
  it('reads a number the native wheel saved as text', () => {
    expect(readProfile({ weightKg: '55', heightCm: '157', age: '22' })).toMatchObject({ weightKg: 55, heightCm: 157, age: 22 });
  });

  it('still drops text that is not a number in range', () => {
    expect(readProfile({ weightKg: 'heavy', heightCm: '9000' })).toEqual({ lock: false });
  });
});
