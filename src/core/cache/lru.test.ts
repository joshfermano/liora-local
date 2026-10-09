import { describe, expect, it } from 'vitest';
import { hashText } from './hash';
import { Lru } from './lru';

describe('Lru', () => {
  it('drops the oldest entry once it is over its size', () => {
    const lru = new Lru<number>(3);
    for (const [i, key] of ['a', 'b', 'c', 'd'].entries()) lru.set(key, i);
    expect(lru.size).toBe(3);
    expect(lru.get('a')).toBeUndefined();
    expect(lru.get('d')).toBe(3);
  });

  it('counts a read as a use, so a read entry outlives an untouched one', () => {
    const lru = new Lru<number>(2);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.get('a');
    lru.set('c', 3);
    expect(lru.get('b')).toBeUndefined();
    expect(lru.get('a')).toBe(1);
  });

  it('overwriting a key keeps one entry and makes it the newest', () => {
    const lru = new Lru<number>(2);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.set('a', 9);
    lru.set('c', 3);
    expect(lru.get('a')).toBe(9);
    expect(lru.get('b')).toBeUndefined();
  });

  it('holds exactly 20 and clears', () => {
    const lru = new Lru<number>(20);
    for (let i = 0; i < 25; i++) lru.set(`k${i}`, i);
    expect(lru.size).toBe(20);
    expect(lru.get('k4')).toBeUndefined();
    expect(lru.get('k5')).toBe(5);
    lru.clear();
    expect(lru.size).toBe(0);
  });

  it('needs room for at least one entry', () => {
    expect(() => new Lru(0)).toThrow();
  });
});

describe('hashText', () => {
  it('is stable and tells different text apart', () => {
    expect(hashText('title: a | text: b')).toBe(hashText('title: a | text: b'));
    expect(hashText('title: a | text: b')).not.toBe(hashText('title: a | text: c'));
    expect(hashText('')).not.toBe(hashText(' '));
  });
});
