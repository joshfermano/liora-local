import type { Context, SourceRef } from '../types';

export interface Rule {
  id: string;
  // Empty codes means the rule is driven by context alone (DT.17).
  codes: string[];
  minSeverity?: 'severe';
  when?: (ctx: Context) => boolean;
  level: 'go_now';
  source: SourceRef;
}
