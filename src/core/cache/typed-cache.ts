import { Lru } from './lru';

export const TYPED_CACHE_SIZE = 20;

export interface ModelKey {
  id: string;
  version: string;
  // The prompt versions the model was given; `typed` is part of the key.
  prompts?: Record<string, string>;
}

// Same message in a different case, spacing or end punctuation asks Gemma the same thing.
export function normalizeMessage(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\s.!?,;:…]+|[\s.!?,;:…]+$/gu, '');
}

export function typedKey(text: string, model: ModelKey): string {
  return JSON.stringify([normalizeMessage(text), model.id, model.version, model.prompts?.typed ?? '']);
}

export type TypedAnswers = Record<string, number[]>;

// Gemma at temperature 0 answers the same message the same way, so a repeat can skip it.
export class TypedAnswerCache {
  private readonly lru = new Lru<TypedAnswers>(TYPED_CACHE_SIZE);

  get(key: string): TypedAnswers | undefined {
    const found = this.lru.get(key);
    return found && structuredClone(found);
  }

  set(key: string, answers: TypedAnswers): void {
    this.lru.set(key, structuredClone(answers));
  }

  clear(): void {
    this.lru.clear();
  }
}

export const typedCache = new TypedAnswerCache();
