import { format, parseISO } from 'date-fns';
import { en } from '../../content/copy';
import { resolveDate, type AgentAction, type SavedItem } from '../../core/agent';
import { dischargeLine } from '../daylog/dischargeLine';

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
      return item.end
        ? fill(en('agent.logged.period_range'), { from: dayWord(item.date), to: dayWord(item.end) })
        : fill(en('agent.logged.period_start'), { date: dayWord(item.date) });
    case 'period_end':
      return fill(en('agent.logged.period_end'), { date: dayWord(item.date) });
    case 'flow':
      return fill(en('agent.logged.flow'), { flow: en(`cal.flow.${item.flow}`), date: dayWord(item.date) });
    case 'symptoms':
      return fill(en('agent.logged.symptoms'), { list: list('symptom', item.values), date: dayWord(item.date) });
    case 'discharge': {
      const what = dischargeLine(item.discharge);
      return fill(en(what ? 'agent.logged.discharge' : 'agent.logged.discharge_plain'), { what: what ?? '', date: dayWord(item.date) });
    }
    case 'moods':
      return fill(en('agent.logged.moods'), { list: list('feeling', item.values).toLowerCase(), date: dayWord(item.date) });
    case 'activities':
      return fill(en('agent.logged.activities'), { list: list('activity', item.values), date: dayWord(item.date) });
    case 'weeks':
      return fill(en('agent.logged.weeks'), { n: String(item.weeks) });
    case 'status':
      return en(`agent.logged.status.${item.status}`);
    case 'period_deleted':
      return item.end
        ? fill(en('agent.logged.period_deleted'), { from: dayWord(item.date), to: dayWord(item.end) })
        : fill(en('agent.logged.period_deleted_open'), { date: dayWord(item.date) });
    case 'day_cleared':
      return fill(en(item.what === 'all' ? 'agent.logged.day_cleared_all' : 'agent.logged.day_cleared'), {
        what: item.what,
        date: dayWord(item.date),
      });
    case 'remembered':
      return fill(en('agent.logged.remembered'), { note: item.note });
    case 'forgot':
      return item.note ? fill(en('agent.logged.forgot'), { note: item.note }) : en('agent.logged.forgot_all');
  }
}

// What she is asked to approve: the same words as a saved line when the date is known.
export function confirmLine(action: AgentAction, today = ymd(new Date())): string | null {
  switch (action.tool) {
    case 'weeks':
      return fill(en('agent.confirm.weeks'), { n: String(action.weeks) });
    case 'set_status':
      return en(`agent.confirm.status.${action.status}`);
    case 'period_start':
    case 'period_end': {
      const date = resolveDate(action.date, today);
      return date ? savedLine({ kind: action.tool, date }) : en(`agent.confirm.${action.tool}`);
    }
    case 'flow': {
      const date = resolveDate(action.date, today);
      return date ? savedLine({ kind: 'flow', date, flow: action.flow }) : en('agent.confirm.replace');
    }
    case 'discharge': {
      const date = resolveDate(action.date, today);
      return date ? savedLine({ kind: 'discharge', date, discharge: action.discharge }) : en('agent.confirm.replace');
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
