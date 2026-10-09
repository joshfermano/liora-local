import { describe, expect, it } from 'vitest';
import { formatPhPhone, typePhPhone } from './phone';

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

describe('typePhPhone', () => {
  it.each([
    ['0', '0'],
    ['091', '091'],
    ['0917', '0917'],
    ['09171', '0917 1'],
    ['0917123', '0917 123'],
    ['09171234', '0917 123 4'],
    ['09171234567', '0917 123 4567'],
    ['091712345678', '0917 123 4567'],
    ['+63917', '+63 917'],
    ['+639171234567', '+63 917 123 4567'],
    ['+6391712345678', '+63 917 123 4567'],
    ['02812', '(02) 812'],
    ['0281234567', '(02) 8123 4567'],
    ['032234', '(032) 234'],
    ['0322345678', '(032) 234 5678'],
  ])('shows %s as %s while she types', (typed, shown) => {
    expect(typePhPhone(typed)).toBe(shown);
  });

  it('keeps only digits and a leading plus', () => {
    expect(typePhPhone('09a17-b12')).toBe('0917 12');
    expect(typePhPhone('6+3')).toBe('63');
  });

  it('lets her clear the field', () => {
    expect(typePhPhone('')).toBe('');
    expect(typePhPhone('(0')).toBe('0');
  });
});

