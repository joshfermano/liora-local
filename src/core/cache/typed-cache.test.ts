import { describe, expect, it } from 'vitest';
import { normalizeMessage, TypedAnswerCache, TYPED_CACHE_SIZE, typedKey } from './typed-cache';

const model = { id: 'gemma-4-E2B-it Q4_0', version: 'llama.rn 0.13.0-rc.7', prompts: { typed: '1.abc' } };

describe('typed answer cache keys', () => {
  it('treats case, spacing and end punctuation as the same message', () => {
    const a = typedKey('Masakit ulo ko', model);
    expect(typedKey('  masakit   ULO ko!! ', model)).toBe(a);
    expect(typedKey('masakit ulo ko…', model)).toBe(a);
  });

  it('keeps messages that mean something else apart', () => {
    expect(typedKey('masakit ulo ko', model)).not.toBe(typedKey('masakit tiyan ko', model));
    expect(normalizeMessage('sakit, ulo')).toBe('sakit, ulo');
  });

  it('changes with the model id, the model version and the prompt version', () => {
    const base = typedKey('masakit ulo ko', model);
    expect(typedKey('masakit ulo ko', { ...model, id: 'other' })).not.toBe(base);
    expect(typedKey('masakit ulo ko', { ...model, version: 'llama.rn 0.14' })).not.toBe(base);
    expect(typedKey('masakit ulo ko', { ...model, prompts: { typed: '2.abc' } })).not.toBe(base);
    expect(typedKey('masakit ulo ko', { ...model, prompts: { typed: '1.abc' } })).toBe(base);
  });
});

describe('typed answer cache', () => {
  const answers = { 'yesno.fever': [0.9, 0.1] };

  it('returns a copy, so a caller cannot change what is kept', () => {
    const cache = new TypedAnswerCache();
    cache.set('k', answers);
    const first = cache.get('k')!;
    first['yesno.fever']![0] = 0;
    expect(cache.get('k')).toEqual(answers);
  });

  it('misses a key it never saw and after a clear', () => {
    const cache = new TypedAnswerCache();
    expect(cache.get('k')).toBeUndefined();
    cache.set('k', answers);
    cache.clear();
    expect(cache.get('k')).toBeUndefined();
  });

  it('keeps the 20 most recent messages', () => {
    const cache = new TypedAnswerCache();
    for (let i = 0; i < TYPED_CACHE_SIZE + 1; i++) cache.set(`k${i}`, answers);
    expect(cache.get('k0')).toBeUndefined();
    expect(cache.get('k1')).toEqual(answers);
    expect(TYPED_CACHE_SIZE).toBe(20);
  });
});
