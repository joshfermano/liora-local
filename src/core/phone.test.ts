import { describe, expect, it } from 'vitest';
import { formatPhPhone } from './phone';

describe('formatPhPhone', () => {
  it.each([
    ['09171234567', '0917 123 4567'],
    ['0917-123-4567', '0917 123 4567'],
    ['917 123 4567', '0917 123 4567'],
    ['+639171234567', '+63 917 123 4567'],
    ['+63 917 123 4567', '+63 917 123 4567'],
    ['639171234567', '0917 123 4567'],
  ])('writes the mobile number %s as %s', (input, shown) => {
    expect(formatPhPhone(input)).toBe(shown);
  });

  it.each([
    ['0281234567', '(02) 8123 4567'],
    ['(02) 8123-4567', '(02) 8123 4567'],
    ['+63 2 8123 4567', '+63 2 8123 4567'],
    ['0322345678', '(032) 234 5678'],
  ])('writes the landline %s as %s', (input, shown) => {
    expect(formatPhPhone(input)).toBe(shown);
  });

  it.each(['12345', '0917123456', '091712345678', '+1 415 555 0100', '08001234567', 'call me'])('does not take %s for a Philippine number', (input) => {
    expect(formatPhPhone(input)).toBeNull();
  });
});
