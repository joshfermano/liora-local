import type { Outcome } from './outcome';
import type { SavedItem, Screen } from './types';

// One thing Liora's tools did in a turn, for the timeline under her reply.
export type Step =
  | { kind: 'read' }
  | { kind: 'undid'; count: number }
  | { kind: 'nothing_to_undo' }
  | { kind: 'saved'; item: SavedItem }
  | { kind: 'not_found' }
  | { kind: 'note_not_found' }
  | { kind: 'asked' }
  | { kind: 'day'; date: string }
  | { kind: 'cycle' }
  | { kind: 'sources'; found: boolean }
  | { kind: 'contact' }
  | { kind: 'opened'; screen: Screen };

// Empty when the turn took no action (small talk, a plain answer), so no timeline is shown.
export function stepsOf(o: Outcome): Step[] {
  const steps: Step[] = [];
  if (o.undid) steps.push({ kind: 'undid', count: o.undid.length });
  if (o.nothingToUndo) steps.push({ kind: 'nothing_to_undo' });
  for (const item of o.saved) steps.push({ kind: 'saved', item });
  if (o.notFound) steps.push({ kind: 'not_found' });
  if (o.noteNotFound) steps.push({ kind: 'note_not_found' });
  if (o.waiting) steps.push({ kind: 'asked' });
  if (o.day) steps.push({ kind: 'day', date: o.day.date });
  if (o.cycle) steps.push({ kind: 'cycle' });
  if (o.card !== null) steps.push({ kind: 'sources', found: o.card });
  if (o.contact) steps.push({ kind: 'contact' });
  if (o.opened) steps.push({ kind: 'opened', screen: o.opened });
  return steps.length > 0 ? [{ kind: 'read' }, ...steps] : [];
}
