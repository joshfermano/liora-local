// What her cycle question is about, so the fixed reply answers that and not a general summary.
const OVULATION = /ovulat|obulasyon|obul|mag-?ovulate|nag-?o-?ovulate/i;
const FERTILE = /fertile|fertility|mabuntis|magbuntis|get\s+pregnant|conceive|baby\s+making/i;

export type CycleTopic = 'ovulation' | 'fertile' | 'period';

export function cycleTopic(text: string): CycleTopic {
  if (OVULATION.test(text)) return 'ovulation';
  if (FERTILE.test(text)) return 'fertile';
  return 'period';
}
