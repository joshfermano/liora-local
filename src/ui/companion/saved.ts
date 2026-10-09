import { format, parseISO } from 'date-fns';
import { en } from '../../content/copy';
import { resolveDate, type AgentAction, type SavedItem } from '../../core/agent';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function dayWord(date: string, now = new Date()): string {
  if (date === ymd(now)) return en('agent.date.today');
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date === ymd(yesterday)) return en('agent.date.yesterday');
  return format(parseISO(date), 'MMM d');
}

const list = (prefix: string, values: string[]) => values.map((v) => en(`${prefix}.${v}`)).join(', ');

export function savedLine(item: SavedItem): string {
  switch (item.kind) {
    case 'period_start':
    case 'period_end':
      return fill(en(`agent.logged.${item.kind}`), { date: dayWord(item.date) });
    case 'flow':
      return fill(en('agent.logged.flow'), { flow: en(`cal.flow.${item.flow}`), date: dayWord(item.date) });
    case 'symptoms':
      return fill(en('agent.logged.symptoms'), { list: list('symptom', item.values), date: dayWord(item.date) });
    case 'moods':
      return fill(en('agent.logged.moods'), { list: list('feeling', item.values).toLowerCase(), date: dayWord(item.date) });
    case 'activities':
      return fill(en('agent.logged.activities'), { list: list('activity', item.values), date: dayWord(item.date) });
    case 'weeks':
      return fill(en('agent.logged.weeks'), { n: String(item.weeks) });
  }
}

// What she is asked to approve: the same words as a saved line when the date is known.
export function confirmLine(action: AgentAction, today = ymd(new Date())): string | null {
  switch (action.tool) {
    case 'weeks':
      return fill(en('agent.confirm.weeks'), { n: String(action.weeks) });
    case 'period_start':
    case 'period_end': {
      const date = resolveDate(action.date, today);
      return date ? savedLine({ kind: action.tool, date }) : en(`agent.confirm.${action.tool}`);
    }
    case 'flow': {
      const date = resolveDate(action.date, today);
      return date ? savedLine({ kind: 'flow', date, flow: action.flow }) : en('agent.confirm.replace');
    }
    case 'symptoms':
    case 'moods':
    case 'activities': {
      const date = resolveDate(action.date, today);
      const values = action.tool === 'symptoms' ? action.symptoms : action.tool === 'moods' ? action.moods : action.activities;
      return date ? savedLine({ kind: action.tool, date, values } as SavedItem) : en('agent.confirm.replace');
    }
    default:
      return null;
  }
}
