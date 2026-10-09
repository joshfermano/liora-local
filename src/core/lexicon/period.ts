import { format, subDays } from 'date-fns';
import type { Extraction } from '../types';

type Period = NonNullable<Extraction['period']>;

// Input patterns only: what she might type about her period. The date is a suggestion she confirms.
const MENTIONS = /\b(?:regla|mens|menstruation|period|dalaw)\b/i;
const STARTED = /\b(?:nagsimula|nag-?start|dumating|nagkaroon|started|began|came)\b/i;
const ENDED = /\b(?:natapos|tapos\s+na|wala\s+na|huminto|ended|stopped|finished)\b/i;
const DAYS_AGO = /\b(\d{1,2})\s*(?:araw|days?)\b/i;

function flowOf(text: string): Period['flow'] {
  if (/\b(?:spotting|patak|patak-patak)\b/i.test(text)) return 'spotting';
  if (/\b(?:malakas|heavy)\b/i.test(text)) return 'heavy';
  if (/\b(?:mahina|konti|light)\b/i.test(text)) return 'light';
  return null;
}

export function readPeriod(text: string, now: Date): Period | null {
  if (!MENTIONS.test(text)) return null;
  const event: Period['event'] = ENDED.test(text) ? 'ended' : STARTED.test(text) ? 'started' : 'ongoing';
  const ago = DAYS_AGO.exec(text);
  const daysAgo = /\b(?:kahapon|yesterday)\b/i.test(text)
    ? 1
    : /\b(?:ngayon|kanina|today|this morning)\b/i.test(text)
      ? 0
      : ago
        ? Number(ago[1])
        : null;
  const when: Period['when'] = daysAgo === null ? 'unknown' : daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : 'days_ago';
  return {
    event,
    when,
    days_ago: daysAgo,
    date: daysAgo === null ? null : format(subDays(now, daysAgo), 'yyyy-MM-dd'),
    flow: flowOf(text),
  };
}
