import { addDays, format, isValid, parseISO } from 'date-fns';
import type { DateWord } from './types';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const MAX_DAYS_AGO = 60;

// The one place a date word becomes a date. Never a future date, never a guess.
export function resolveDate(word: DateWord, today: string): string | null {
  const base = parseISO(today);
  switch (word.kind) {
    case 'today':
      return today;
    case 'yesterday':
      return fmt(addDays(base, -1));
    case 'days_ago':
      return Number.isInteger(word.n) && word.n >= 1 && word.n <= MAX_DAYS_AGO ? fmt(addDays(base, -word.n)) : null;
    case 'date': {
      const d = parseISO(word.date);
      return isValid(d) && fmt(d) === word.date && word.date <= today ? word.date : null;
    }
    default:
      return null;
  }
}
