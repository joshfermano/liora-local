import type { Context, SourceRef } from '../types';

export interface Rule {
  id: string;
  // Empty codes means the rule is driven by context alone (DT.17).
  codes: string[];
  minSeverity?: 'severe';
  when?: (ctx: Context) => boolean;
  // go_now: "immediately, day or night"; go_soon: "as soon as possible" (WHO PCPNC M2).
  level: 'go_now' | 'go_soon';
  source: SourceRef;
  // The reviewed card that quotes this rule's WHO passage word for word.
  card?: string;
}
