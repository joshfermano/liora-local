import { readText } from '../lexicon';
import { DANGER_CODES } from '../vocabulary';
import { readActions } from './read';
import type { AgentAction, Tool } from './types';

// System 1: a fast, deterministic first read of what she wants from this message, before anything
// acts. Urgent help always wins; when it cannot tell, the full safety check runs.
export type Purpose = 'urgent' | 'update' | 'ask' | 'chat' | 'health' | 'unclear';

// Which of Gemma's typed danger answers count: all of them, none (an edit or a question about her
// own data), or all but bleeding (logging a period while not pregnant).
export type TypedScope = 'all' | 'none' | 'no_bleeding';

export interface Triage {
  purpose: Purpose;
  typed: TypedScope;
  actions: AgentAction[];
}

const MEMORY: ReadonlySet<Tool> = new Set(['remember', 'forget']);
const EDITS: ReadonlySet<Tool> = new Set(['delete_period', 'clear_day', 'undo_last']);
const READS: ReadonlySet<Tool> = new Set(['ask_day', 'open', 'cycle_question']);
const PERIOD_LOGS: ReadonlySet<Tool> = new Set(['period_start', 'period_end', 'flow']);
const LOGS: ReadonlySet<Tool> = new Set(['period_start', 'period_end', 'flow', 'symptoms', 'moods', 'activities', 'weeks']);

const QUESTION = /\?|^\s*(?:ano|kailan|ilang|ilan|gaano|paano|how|what|when|which|am\s+i|is\s+my|do\s+i|did\s+i|have\s+i|was\s+i)\b/i;
const SELF = /\b(?:my|me|i|ako|ko|akin|aking|sa\s+akin)\b/i;
const ABOUT_HER =
  /cycle|period|regla|mens|dalaw|fertile|ovulat|obul|weeks?\b|linggo|buntis|pregnan|mood|feel|pakiramdam|symptom|sintomas|nilog|logged|\blog\b|average|pattern|haba|length|\bnext\b|\blast\b|huli/i;

const isDanger = (code: string) => (DANGER_CODES as readonly string[]).includes(code);

export function triage(text: string, today: string, status: string | undefined): Triage {
  const actions = readActions(text, today);
  const tools = actions.map((a) => a.tool);
  if (readText(text).some((f) => isDanger(f.code))) return { purpose: 'urgent', typed: 'all', actions };

  // A note is her own words, so Gemma's danger answers still apply; only a clear turn may store it.
  if (tools.some((t) => MEMORY.has(t))) return { purpose: 'update', typed: 'all', actions };
  if (tools.some((t) => EDITS.has(t))) return { purpose: 'update', typed: 'none', actions };
  if (tools.some((t) => LOGS.has(t))) {
    const typed: TypedScope = tools.includes('symptoms')
      ? 'all'
      : tools.some((t) => PERIOD_LOGS.has(t))
        ? status === 'neither'
          ? 'no_bleeding'
          : 'all'
        : 'none';
    return { purpose: 'update', typed, actions };
  }

  const aboutHerself = QUESTION.test(text) && SELF.test(text) && ABOUT_HER.test(text);
  if (tools.some((t) => READS.has(t)) || aboutHerself) return { purpose: 'ask', typed: 'none', actions };
  if (tools.includes('smalltalk')) return { purpose: 'chat', typed: 'none', actions };
  if (tools.includes('health_question')) return { purpose: 'health', typed: 'all', actions };
  return { purpose: 'unclear', typed: 'all', actions };
}

export function scopeAnswers(
  answers: Record<string, number[]> | undefined,
  scope: TypedScope,
): Record<string, number[]> | undefined {
  if (!answers || scope === 'none') return undefined;
  if (scope === 'all') return answers;
  return Object.fromEntries(Object.entries(answers).filter(([id]) => !id.endsWith('.vaginal_bleeding')));
}
