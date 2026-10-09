import type { Entry } from '../core/types';

export interface SourceCardData {
  id: string;
  title: string;
  quote: string;
  source: string;
}

// Source cards arrive with the retrieval work (FR-8); until then no card is found.
export function cardForRule(_ruleId: string): SourceCardData | null {
  return null;
}

export function bestCard(_entry: Entry): SourceCardData | null {
  return null;
}
