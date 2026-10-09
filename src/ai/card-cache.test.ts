import { describe, expect, it } from 'vitest';
import { cardKey, reuseVectors, serializeVectors, type CardText } from './card-cache';

const MODEL = 'embeddinggemma-300M-qat-Q4_0.gguf';
const a: CardText = { id: 'a', title: 'Any concern', quote: 'Go to the facility if you have a concern.' };
const b: CardText = { id: 'b', title: 'Rest', quote: 'Rest when tired.' };
const saved = (cards: CardText[], model = MODEL) =>
  serializeVectors(model, Object.fromEntries(cards.map((c, i) => [c.id, { key: cardKey(c), vector: [i + 1, 0.5] }])));

describe('card key', () => {
  it('changes with the title or the quote, and not with the id', () => {
    expect(cardKey(a)).toBe(cardKey({ ...a, id: 'z' }));
    expect(cardKey(a)).not.toBe(cardKey({ ...a, title: 'Any concerns' }));
    expect(cardKey(a)).not.toBe(cardKey({ ...a, quote: 'Go to the facility.' }));
  });
});

describe('reusing saved card vectors', () => {
  it('reuses every vector when nothing changed and embeds nothing', () => {
    const out = reuseVectors(saved([a, b]), MODEL, [a, b]);
    expect(out.missing).toEqual([]);
    expect(out.kept.a?.vector).toEqual([1, 0.5]);
    expect(out.changed).toBe(false);
  });

  it('embeds only a new card', () => {
    const out = reuseVectors(saved([a]), MODEL, [a, b]);
    expect(out.missing).toEqual([b]);
    expect(Object.keys(out.kept)).toEqual(['a']);
    expect(out.changed).toBe(true);
  });

  it('embeds only a card whose title or quote changed', () => {
    const edited = { ...b, quote: 'Rest when you are tired.' };
    const out = reuseVectors(saved([a, b]), MODEL, [a, edited]);
    expect(out.missing).toEqual([edited]);
    expect(out.kept.a).toBeDefined();
  });

  it('drops every vector made by another embedder model', () => {
    const out = reuseVectors(saved([a, b], 'older-model.gguf'), MODEL, [a, b]);
    expect(out.missing).toEqual([a, b]);
    expect(out.kept).toEqual({});
  });

  it('notices a removed card so the file is rewritten without it', () => {
    const out = reuseVectors(saved([a, b]), MODEL, [a]);
    expect(out.missing).toEqual([]);
    expect(out.changed).toBe(true);
  });

  it.each([null, '', 'not json', '{"v":2}', '{"v":1,"model":"x"}', 'null'])('treats %j as nothing saved', (raw) => {
    expect(reuseVectors(raw, MODEL, [a, b]).missing).toEqual([a, b]);
  });

  it('does not trust a damaged vector', () => {
    const raw = JSON.stringify({ v: 1, model: MODEL, cards: { a: { key: cardKey(a), vector: [] }, b: { key: cardKey(b), vector: [1, 'x'] } } });
    expect(reuseVectors(raw, MODEL, [a, b]).missing).toEqual([a, b]);
  });
});
