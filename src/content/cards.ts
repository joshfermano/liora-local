import type { DangerCode, Entry } from '../core/types';
import { CARD_DATA } from './cards.data';

export interface SourceCardData {
  id: string;
  title: string;
  quote: string;
  source: string;
}

export interface CardData extends SourceCardData {
  codes: DangerCode[];
  stage: 'pregnancy' | 'postpartum';
}

export const CARDS: CardData[] = CARD_DATA;

const linkedTo = (code: string) => CARDS.filter((card) => (card.codes as string[]).includes(code));

// "Why?" opens a reviewed card that names the sign behind the fired rule; pregnancy cards first.
export function cardForRule(ruleId: string): CardData | null {
  const code = ruleId.startsWith('ANC.DT.01.') ? ruleId.slice('ANC.DT.01.'.length) : null;
  if (!code) return null;
  const cards = linkedTo(code);
  return cards.find((card) => card.stage === 'pregnancy') ?? cards[0] ?? null;
}

// The card retrieval chose by meaning (FR-8) comes first; otherwise a card that names one of her signs.
export function bestCard(entry: Entry): CardData | null {
  const chosen = CARDS.find((card) => card.id === entry.card_ids[0]);
  if (chosen) return chosen;
  for (const finding of entry.findings) {
    const card = linkedTo(finding.code).find((c) => c.stage === 'pregnancy') ?? linkedTo(finding.code)[0];
    if (card) return card;
  }
  return null;
}
