import { describe, expect, it } from 'vitest';
import { jsonFrom } from './json-out';

const ACTIONS = { actions: [{ tool: 'cycle_question' }] };

describe('the JSON in a model reply', () => {
  it.each([
    ['plain', '{"actions":[{"tool":"cycle_question"}]}'],
    ['fenced, as Gemma 4 does on the phone', '```json\n{"actions":[{"tool":"cycle_question"}]}\n```'],
    ['fenced without a language', '```\n{"actions":[{"tool":"cycle_question"}]}\n```'],
    ['after a stray token', '<|channel>{"actions":[{"tool":"cycle_question"}]}'],
  ])('reads it when %s', (_, raw) => {
    expect(jsonFrom(raw)).toEqual(ACTIONS);
  });

  it('fails plainly when there is none', () => {
    expect(() => jsonFrom('I cannot help with that.')).toThrow();
  });
});
