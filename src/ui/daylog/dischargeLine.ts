import { en } from '../../content/copy';
import type { Discharge } from '../../core/types';

// One line for her log and the report, e.g. "White, creamy, light".
export function dischargeLine(d: Discharge | undefined): string | null {
  if (!d) return null;
  const parts = [
    d.color && en(`discharge.color.${d.color}`),
    d.texture && en(`discharge.texture.${d.texture}`),
    d.amount && en(`discharge.amount.${d.amount}`),
    d.smell === 'unusual' && en('discharge.smell.unusual'),
  ].filter((p): p is string => !!p);
  return parts.length ? parts.join(', ') : null;
}
