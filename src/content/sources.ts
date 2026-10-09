import { DT01_SOURCE, DT17_SOURCE } from '../core/rules/who';
import { CARDS, type CardData } from './cards';

export interface SourceDoc {
  id: string;
  org: string;
  title: string;
  year: number | null;
  url: string;
  cards: CardData[];
  rules: string[];
}

const PARTS = /^([^,]+), (.+?)(?:, ((?:M\d+, )?p\. \d+))?$/;
const YEAR = /^(.*) \((\d{4})\)(.*)$/;

// Card titles read "ORG, Document title (year), M2, p. 163"; split them without changing a word.
export function parseCardTitle(title: string): { org: string; title: string; year: number | null; where: string } {
  const m = PARTS.exec(title);
  if (!m) return { org: '', title, year: null, where: '' };
  const [, org = '', doc = title, where = ''] = m;
  const y = YEAR.exec(doc);
  if (y) return { org, title: `${y[1]}${y[3]}`, year: Number(y[2]), where };
  return { org, title: doc, year: null, where };
}

export const passageLabel = (card: CardData): string => parseCardTitle(card.title).where || card.title;

const idOf = (url: string) =>
  url
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

export function groupSources(cards: CardData[]): SourceDoc[] {
  const byUrl = new Map<string, SourceDoc>();
  byUrl.set(DT01_SOURCE.url, {
    id: idOf(DT01_SOURCE.url),
    org: DT01_SOURCE.org,
    title: DT01_SOURCE.title,
    year: DT01_SOURCE.year,
    url: DT01_SOURCE.url,
    cards: [],
    rules: [DT01_SOURCE.ref, DT17_SOURCE.ref],
  });
  for (const card of cards) {
    const doc = byUrl.get(card.source);
    if (doc) {
      doc.cards.push(card);
      continue;
    }
    const { org, title, year } = parseCardTitle(card.title);
    byUrl.set(card.source, { id: idOf(card.source), org, title, year, url: card.source, cards: [card], rules: [] });
  }
  return [...byUrl.values()];
}

export const SOURCES: SourceDoc[] = groupSources(CARDS);
