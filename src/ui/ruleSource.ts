import { DT01_SOURCE, DT17_SOURCE } from '../core/rules/who';
import type { SourceRef } from '../core/types';

export function sourceFor(ruleId: string): SourceRef | null {
  if (ruleId.startsWith('ANC.DT.01')) return DT01_SOURCE;
  if (ruleId.startsWith('ANC.DT.17')) return DT17_SOURCE;
  return null;
}

export function sourceLine(source: SourceRef): string {
  return `${source.org} ${source.ref}, ${source.year}`;
}
