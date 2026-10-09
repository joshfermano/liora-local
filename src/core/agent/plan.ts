import { resolveDate } from './dates';
import { dayHas, flowClashes, openPeriodFor, periodsToDelete, shift, startFits } from './fit';
import type { AgentAction, AgentData, AgentPlan } from './types';

type Verdict = 'apply' | 'confirm' | 'skip';

function verdict(a: AgentAction, data: AgentData, status: string | undefined, today: string): Verdict {
  switch (a.tool) {
    case 'cycle_question':
    case 'health_question':
    case 'smalltalk':
    case 'undo_last':
    case 'ask_day':
    case 'open':
    case 'contact':
      return 'skip';
    case 'remember':
    case 'forget':
      return 'apply';
    case 'delete_period': {
      const date = resolveDate(a.date, today);
      return date && periodsToDelete(date, a.span, data, today).length > 0 ? 'apply' : 'skip';
    }
    case 'clear_day': {
      const date = resolveDate(a.date, today);
      return date && dayHas(date, a.what, data) ? 'apply' : 'skip';
    }
    case 'weeks':
      return status === 'pregnant' ? 'apply' : 'confirm';
    case 'set_name':
      return a.name === data.setup?.name ? 'skip' : 'confirm';
    case 'set_status':
      // Already her status: nothing to ask.
      return a.status === status ? 'skip' : 'confirm';
    case 'discharge':
      return resolveDate(a.date, today) ? 'apply' : 'confirm';
    case 'symptoms':
    case 'moods':
    case 'activities': {
      const values = a.tool === 'symptoms' ? a.symptoms : a.tool === 'moods' ? a.moods : a.activities;
      if (values.length === 0) return 'skip';
      return resolveDate(a.date, today) ? 'apply' : 'confirm';
    }
    default: {
      const date = resolveDate(a.date, today);
      if (!date) return 'confirm';
      if (a.tool === 'period_start') return startFits(date, data, today) ? 'apply' : 'confirm';
      if (a.tool === 'period_end') return openPeriodFor(date, data.periods) ? 'apply' : 'confirm';
      return flowClashes(date, a.flow, data) ? 'confirm' : 'apply';
    }
  }
}

// Clear logs are saved at once; anything that replaces data, needs a date or changes her status
// waits for her tap.
// A flow on a day with no period on or next to it is her period starting, so it is logged with her
// usual length rather than as one day. Spotting stays a single day.
function asStart(a: AgentAction, data: AgentData, today: string): AgentAction {
  if (a.tool !== 'flow' || a.flow === 'spotting') return a;
  const date = resolveDate(a.date, today);
  if (!date || !startFits(date, data, today)) return a;
  const near = [date, shift(date, -1), shift(date, 1)];
  if (data.dayLogs.some((l) => l.flow !== null && near.includes(l.date))) return a;
  return { tool: 'period_start', date: a.date, flow: a.flow };
}

export function planActions(actions: AgentAction[], data: AgentData, status: string | undefined, today: string): AgentPlan {
  const plan: AgentPlan = { apply: [], confirm: [] };
  const starts = actions.some((a) => a.tool === 'period_start');
  for (const a of starts ? actions : actions.map((x) => asStart(x, data, today))) {
    const v = verdict(a, data, status, today);
    if (v === 'skip') continue;
    // A period while her profile says pregnant: nothing is saved until she says she is not
    // pregnant, and that answer updates her profile first.
    if (status === 'pregnant' && PERIOD_LOGS.has(a.tool)) plan.confirm.push(a);
    else plan[v].push(a);
  }
  if (status === 'pregnant' && plan.confirm.some((a) => PERIOD_LOGS.has(a.tool))) {
    plan.confirm.unshift({ tool: 'set_status', status: 'neither' });
  }
  return plan;
}

const PERIOD_LOGS: ReadonlySet<AgentAction['tool']> = new Set(['period_start', 'period_end', 'flow']);
