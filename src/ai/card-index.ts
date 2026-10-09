import { CARDS } from '../content/cards';
import type { Context } from '../core/types';
import { noteHit } from '../core/probe';
import { CARD_VECTORS_KEY, cardKey, reuseVectors, serializeVectors, type SavedVector } from './card-cache';
import { EMBEDDER_GGUF } from './embedder-model';
import { loadEmbedder, type Embedder } from './embedder';
import { cosine, docPrompt, pickCard, PROVISIONAL_TAU_CARD, queryPrompt, stageFor, type IndexedCard } from './retrieval';

// Medicine advice is out of scope (PRODUCT.md), so the quoted "do not take medication" cards are never offered.
const SEARCHABLE = CARDS.filter((card) => !/medication/.test(card.id));

// The cards are embedded on the phone with the same model and prompts as her message. The vectors
// are kept on the phone too, so a later launch embeds only the cards that are new or changed.
let ready: Promise<{ embedder: Embedder; index: IndexedCard[]; fromDisk: boolean }> | null = null;

// The app hands over its key-value storage at launch (src/ai may not import src/store); without it
// the vectors are embedded each launch.
export interface VectorStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
let storage: VectorStorage | null = null;

export function setCardVectorStorage(next: VectorStorage | null): void {
  storage = next;
}

async function savedVectors(): Promise<string | null> {
  try {
    return (await storage?.getItem(CARD_VECTORS_KEY)) ?? null;
  } catch {
    return null;
  }
}

function cardIndex() {
  ready ??= (async () => {
    const embedder = await loadEmbedder();
    const { kept, missing, changed } = reuseVectors(await savedVectors(), EMBEDDER_GGUF.file, SEARCHABLE);
    const vectors: Record<string, SavedVector> = { ...kept };
    for (const card of missing) {
      vectors[card.id] = { key: cardKey(card), vector: await embedder.embed(docPrompt(card.title, card.quote)) };
    }
    if (changed) await storage?.setItem(CARD_VECTORS_KEY, serializeVectors(EMBEDDER_GGUF.file, vectors)).catch(() => {});
    const index: IndexedCard[] = SEARCHABLE.map((card) => ({ id: card.id, stage: card.stage, vector: vectors[card.id]!.vector }));
    return { embedder, index, fromDisk: missing.length === 0 };
  })().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function readyIndex() {
  const warm = ready !== null;
  const built = await cardIndex();
  if (warm || built.fromDisk) noteHit('cards');
  return built;
}

export async function retrieveCard(text: string, context: Context): Promise<string | null> {
  const stage = stageFor(context);
  if (!stage) return null;
  const { embedder, index } = await readyIndex();
  const query = await embedder.embed(queryPrompt(text));
  return pickCard(query, index, { stage, tau: PROVISIONAL_TAU_CARD })?.id ?? null;
}

export async function rankCards(text: string, context: Context, top: number): Promise<{ id: string; score: number }[]> {
  const stage = stageFor(context);
  if (!stage) return [];
  const { embedder, index } = await readyIndex();
  const query = await embedder.embed(queryPrompt(text));
  return index
    .filter((card) => card.stage === stage)
    .map((card) => ({ id: card.id, score: cosine(query, card.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}
