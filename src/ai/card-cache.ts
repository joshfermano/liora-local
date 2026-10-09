import { hashText } from '../core/cache/hash';
import { docPrompt } from './retrieval';

export const CARD_VECTORS_KEY = 'tell-liora-card-vectors';

export interface CardText {
  id: string;
  title: string;
  quote: string;
}

export interface SavedVector {
  key: string;
  vector: number[];
}

interface Saved {
  v: 1;
  model: string;
  cards: Record<string, SavedVector>;
}

// The key is the hash of the exact text the embedder reads, so an edit to a card's title or quote,
// or to the document prompt, makes that card (or every card) stale.
export const cardKey = (card: CardText): string => hashText(docPrompt(card.title, card.quote));

const isVector = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.every((n) => typeof n === 'number' && Number.isFinite(n));

function parse(raw: string | null): Saved | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as Partial<Saved> | null;
    if (saved?.v !== 1 || typeof saved.model !== 'string' || !saved.cards || typeof saved.cards !== 'object') return null;
    return saved as Saved;
  } catch {
    return null;
  }
}

// What the disk can supply for these cards, and which cards still need the embedder. A vector from
// another embedder model, a changed card or a damaged file is simply missing.
export function reuseVectors(raw: string | null, model: string, cards: readonly CardText[]) {
  const saved = parse(raw);
  const usable = saved?.model === model ? saved.cards : {};
  const kept: Record<string, SavedVector> = {};
  const missing: CardText[] = [];
  for (const card of cards) {
    const found = usable[card.id];
    if (found && found.key === cardKey(card) && isVector(found.vector)) kept[card.id] = found;
    else missing.push(card);
  }
  // A removed card also changes the file, so it is not kept forever.
  const pruned = saved !== null && Object.keys(saved.cards).some((id) => !cards.some((c) => c.id === id));
  return { kept, missing, changed: missing.length > 0 || pruned || saved?.model !== model };
}

export function serializeVectors(model: string, cards: Record<string, SavedVector>): string {
  return JSON.stringify({ v: 1, model, cards } satisfies Saved);
}
