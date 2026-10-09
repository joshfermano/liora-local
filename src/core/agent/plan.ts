import { resolveDate } from './dates';
import { dayHas, flowClashes, openPeriodFor, periodsToDelete, startFits } from './fit';
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
    case 'set_status':
      return 'confirm';
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
export function planActions(actions: AgentAction[], data: AgentData, status: string | undefined, today: string): AgentPlan {
  const plan: AgentPlan = { apply: [], confirm: [] };
  for (const a of actions) {
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
