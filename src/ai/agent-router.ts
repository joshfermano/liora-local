import { z } from 'zod';
import { cleanForPrompt, WRITE_TOOLS, type AgentAction, type DateWord, type Screen } from '../core/agent';
import { ActivitySchema, FlowSchema, MoodSchema, SymptomSchema } from '../core/types';
import { ACTIVITIES, FLOWS, MOODS, SYMPTOMS } from '../core/vocabulary';
import { runJson } from './gemma-session';
import { notePrompt } from '../core/probe';
import { modelTime } from '../core/timing';
import { fill, PROMPTS } from './prompts';

const TOOLS = [...WRITE_TOOLS.filter((t) => t !== 'set_status'), 'undo_last', 'ask_day', 'open', 'cycle_question', 'health_question', 'smalltalk'] as const;
const DATES = ['today', 'yesterday', 'days_ago', 'unknown'] as const;
const PARTS = ['all', 'flow', 'symptoms', 'moods', 'activities'] as const;
const SCREENS = ['calendar', 'mood_check', 'checklist', 'profile', 'log_day'] as const satisfies readonly Screen[];
export const ROUTER_TIMEOUT_MS = 4000;
const dev = typeof __DEV__ !== 'undefined' && __DEV__;

// Closed on purpose: every field is an enum or a small integer, so nothing she says can become free text.
export const ROUTER_SCHEMA = {
  type: 'object',
  properties: {
    actions: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          tool: { enum: [...TOOLS] },
          date: { enum: [...DATES] },
          n: { type: 'integer', minimum: 1, maximum: 60 },
          flow: { enum: [...FLOWS] },
          symptoms: { type: 'array', maxItems: 4, items: { enum: [...SYMPTOMS] } },
          moods: { type: 'array', maxItems: 4, items: { enum: [...MOODS] } },
          activities: { type: 'array', maxItems: 4, items: { enum: [...ACTIVITIES] } },
          weeks: { type: 'integer', minimum: 1, maximum: 45 },
          what: { enum: [...PARTS] },
          screen: { enum: [...SCREENS] },
        },
        required: ['tool'],
        additionalProperties: false,
      },
    },
  },
  required: ['actions'],
  additionalProperties: false,
} as const;

const Item = z.object({
  tool: z.enum(TOOLS),
  date: z.enum(DATES).optional(),
  n: z.number().int().min(1).max(60).optional(),
  flow: FlowSchema.optional(),
  symptoms: z.array(SymptomSchema).optional(),
  moods: z.array(MoodSchema).optional(),
  activities: z.array(ActivitySchema).optional(),
  weeks: z.number().int().min(1).max(45).optional(),
  what: z.enum(PARTS).optional(),
  screen: z.enum(SCREENS).optional(),
});
type Item = z.infer<typeof Item>;

function dateOf(item: Item): DateWord {
  switch (item.date) {
    case 'today':
      return { kind: 'today' };
    case 'yesterday':
      return { kind: 'yesterday' };
    case 'days_ago':
      return item.n === undefined ? { kind: 'unknown' } : { kind: 'days_ago', n: item.n };
    default:
      return { kind: 'unknown' };
  }
}

const some = <T>(values: T[] | undefined): T[] | null => {
  const unique = [...new Set(values ?? [])];
  return unique.length > 0 ? unique : null;
};

function toAction(item: Item): AgentAction | null {
  switch (item.tool) {
    case 'period_start':
      return { tool: 'period_start', date: dateOf(item), flow: item.flow ?? null };
    case 'period_end':
      return { tool: 'period_end', date: dateOf(item) };
    case 'flow':
      return item.flow ? { tool: 'flow', date: dateOf(item), flow: item.flow } : null;
    case 'symptoms': {
      const symptoms = some(item.symptoms);
      return symptoms ? { tool: 'symptoms', date: dateOf(item), symptoms } : null;
    }
    // The word rules read discharge and her name; Gemma's routes never carry them.
    case 'discharge':
    case 'set_name':
      return null;
    case 'moods': {
      const moods = some(item.moods);
      return moods ? { tool: 'moods', date: dateOf(item), moods } : null;
    }
    case 'activities': {
      const activities = some(item.activities);
      return activities ? { tool: 'activities', date: dateOf(item), activities } : null;
    }
    case 'weeks':
      return item.weeks === undefined ? null : { tool: 'weeks', weeks: item.weeks };
    case 'delete_period':
      return { tool: 'delete_period', date: dateOf(item) };
    // A clear with no part named would wipe a whole day; leave it out.
    case 'clear_day':
      return item.what ? { tool: 'clear_day', date: dateOf(item), what: item.what } : null;
    case 'ask_day':
      return { tool: 'ask_day', date: dateOf(item) };
    case 'open':
      return item.screen ? { tool: 'open', screen: item.screen } : null;
    case 'undo_last':
    case 'cycle_question':
    case 'health_question':
    case 'smalltalk':
      return { tool: item.tool };
  }
}

// Anything outside the schema is dropped, one item at a time; the rest still count.
export function parseActions(raw: unknown): AgentAction[] {
  const list = (raw as { actions?: unknown } | null)?.actions;
  if (!Array.isArray(list)) return [];
  const out: AgentAction[] = [];
  for (const candidate of list) {
    const parsed = Item.safeParse(candidate);
    const action = parsed.success ? toAction(parsed.data) : null;
    if (action) out.push(action);
  }
  return out;
}

// `before` is the last exchange, so "do it" or "sige" can be read as what the chat was about.
export function routerPrompt(text: string, before?: { her?: string; liora?: string }): string {
  const quote = (s: string) => cleanForPrompt(s, 200).replace(/"/g, "'");
  const lines = [before?.her ? `Her: "${quote(before.her)}"` : '', before?.liora ? `Liora: "${quote(before.liora)}"` : ''].filter(Boolean);
  return fill(PROMPTS.router.text, {
    message: cleanForPrompt(text).replace(/"/g, "'"),
    before: lines.length ? `Chat before: ${lines.join(' ')}\n` : '',
  });
}

// Errors and timeouts mean no actions; the word rules have already read what they could.
export async function routeWithGemma(text: string, before?: { her?: string; liora?: string }): Promise<AgentAction[]> {
  notePrompt('router', PROMPTS.router.version);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), modelTime(ROUTER_TIMEOUT_MS));
  });
  try {
    const raw = await Promise.race([runJson(routerPrompt(text, before), ROUTER_SCHEMA, modelTime(ROUTER_TIMEOUT_MS)), timeout]);
    if (dev) console.log(`[router] ${raw === null ? 'timed out' : JSON.stringify(raw)}`);
    return parseActions(raw);
  } catch (error) {
    if (dev) console.warn(`[router] failed: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
