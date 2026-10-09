import { resolveDate } from './dates';
import { flowClashes, openPeriodFor, startFits } from './fit';
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
    case 'delete_period':
    case 'clear_day':
      return 'skip';
    case 'weeks':
      return status === 'pregnant' ? 'apply' : 'confirm';
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
    if (v !== 'skip') plan[v].push(a);
  }
  return plan;
}
