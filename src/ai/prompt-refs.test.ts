import { describe, expect, it } from 'vitest';
import { GEMMA_MODEL_REF } from './gemma-model';
import { TYPED_PROMPT_KEY } from './prompt-refs';

describe('prompt refs', () => {
  it('names the typed frame version first and a hash of the question wordings after it', () => {
    expect(TYPED_PROMPT_KEY).toMatch(/^1\.[0-9a-z]+$/);
  });

  it('puts the typed key on the model ref that entries record', () => {
    expect(GEMMA_MODEL_REF.prompts).toEqual({ typed: TYPED_PROMPT_KEY });
  });
});
