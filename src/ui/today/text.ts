import { format, parseISO } from 'date-fns';
import { en } from '../../content/copy';
import type { Answer } from '../../core/today';

export const fill = (key: string, params: Record<string, string | number>) =>
  Object.entries(params).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), en(key));

export const days = (n: number) => (n === 1 ? en('td.day_one') : fill('td.days', { n }));

export const shortDate = (iso: string) => format(parseISO(iso), 'MMM d');

export function rangeText(from: string, to: string) {
  const a = parseISO(from);
  const b = parseISO(to);
  const sameMonth = format(a, 'yyyyMM') === format(b, 'yyyyMM');
  return fill('td.next.range', {
    from: format(a, 'MMM d'),
    to: format(b, sameMonth ? 'd' : 'MMM d'),
  });
}

export interface AnswerText {
  title: string;
  sub: string | null;
  cycleDay: number | null;
  confidence: 'low' | 'medium' | 'high' | null;
}

export function answerText(a: Answer): AnswerText {
  switch (a.kind) {
    case 'first_run':
      return { title: en('td.first_run'), sub: en('td.first_run.sub'), cycleDay: null, confidence: null };
    case 'pregnant':
      return {
        title: a.weeks === null ? en('td.pregnant.unknown') : fill('td.pregnant', { n: a.weeks }),
        sub: en('td.pregnant.sub'),
        cycleDay: null,
        confidence: null,
      };
    case 'postpartum':
      return { title: en('td.postpartum'), sub: en('td.postpartum.sub'), cycleDay: null, confidence: null };
    case 'period':
      return { title: fill('td.period', { n: a.day }), sub: null, cycleDay: a.day, confidence: null };
    case 'countdown': {
      const title =
        a.from === a.to
          ? a.to === 1
            ? en('td.countdown.tomorrow')
            : fill('td.countdown.one_value', { n: a.to })
          : fill('td.countdown', { from: a.from, to: a.to });
      return { title, sub: null, cycleDay: a.cycleDay, confidence: a.confidence };
    }
    case 'any_day':
      return { title: en('td.any_day'), sub: null, cycleDay: a.cycleDay, confidence: a.confidence };
    case 'past_window':
      return {
        title: fill('td.past_window', { n: a.cycleDay }),
        sub: en('td.past_window.sub'),
        cycleDay: null,
        confidence: a.confidence,
      };
    case 'cycle_day':
      return { title: fill('td.cycle_day', { n: a.cycleDay }), sub: null, cycleDay: null, confidence: null };
  }
}
