import { CARDS } from '../content/cards';
import type { Context } from '../core/types';
import { loadEmbedder, type Embedder } from './embedder';
import { cosine, docPrompt, pickCard, PROVISIONAL_TAU_CARD, queryPrompt, stageFor, type IndexedCard } from './retrieval';

// The cards are embedded on the phone with the same model and prompts as her message, once per launch.
let ready: Promise<{ embedder: Embedder; index: IndexedCard[] }> | null = null;

function cardIndex() {
  ready ??= (async () => {
    const embedder = await loadEmbedder();
    const index: IndexedCard[] = [];
    for (const card of CARDS) {
      index.push({ id: card.id, stage: card.stage, vector: await embedder.embed(docPrompt(card.title, card.quote)) });
    }
    return { embedder, index };
  })().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}

export async function retrieveCard(text: string, context: Context): Promise<string | null> {
  const stage = stageFor(context);
  if (!stage) return null;
  const { embedder, index } = await cardIndex();
  const query = await embedder.embed(queryPrompt(text));
  return pickCard(query, index, { stage, tau: PROVISIONAL_TAU_CARD })?.id ?? null;
}

export async function rankCards(text: string, context: Context, top: number): Promise<{ id: string; score: number }[]> {
  const stage = stageFor(context);
  if (!stage) return [];
  const { embedder, index } = await cardIndex();
  const query = await embedder.embed(queryPrompt(text));
  return index
    .filter((card) => card.stage === stage)
    .map((card) => ({ id: card.id, score: cosine(query, card.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}
