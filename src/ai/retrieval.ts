import type { Context } from '../core/types';

export type Stage = 'pregnancy' | 'postpartum';
export interface IndexedCard {
  id: string;
  stage: Stage;
  vector: number[];
}

// Provisional; LUM-77 tunes it on the eval phrases. Below it the calm screen says "Ask at your check-up".
export const PROVISIONAL_TAU_CARD = 0.45;

// EmbeddingGemma's own prompt formats for a search query and a document.
export const queryPrompt = (text: string) => `task: search result | query: ${text}`;
export const docPrompt = (title: string, text: string) => `title: ${title} | text: ${text}`;

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function stageFor(context: Context): Stage | null {
  if (context.status === 'pregnant') return 'pregnancy';
  if (context.status === 'postpartum') return 'postpartum';
  return null;
}

// Retrieval only chooses which reviewed card to show; it never decides (SR-7).
export function pickCard(
  query: number[],
  index: IndexedCard[],
  { stage, tau }: { stage: Stage; tau: number },
): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null;
  for (const card of index) {
    if (card.stage !== stage) continue;
    const score = cosine(query, card.vector);
    if (!best || score > best.score) best = { id: card.id, score };
  }
  return best && best.score >= tau ? best : null;
}
