import { z } from 'zod';
import { WRITE_TOOLS, type AgentAction, type DateWord } from '../core/agent';
import { ActivitySchema, FlowSchema, MoodSchema, SymptomSchema } from '../core/types';
import { ACTIVITIES, FLOWS, MOODS, SYMPTOMS } from '../core/vocabulary';
import { runJson } from './gemma-session';

const TOOLS = [...WRITE_TOOLS, 'cycle_question', 'health_question', 'smalltalk'] as const;
const DATES = ['today', 'yesterday', 'days_ago', 'unknown'] as const;
export const ROUTER_TIMEOUT_MS = 4000;

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
    case 'cycle_question':
    case 'health_question':
    case 'smalltalk':
      return { tool: item.tool };
    default:
      return null;
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

export function routerPrompt(text: string): string {
  return (
    'Read the message of a pregnant woman or new mother (Tagalog, Taglish, Cebuano or English). ' +
    'List what she wants noted or asked, using only the allowed tools. Say nothing else.\n' +
    'Tools: period_start, period_end, flow, symptoms, moods, activities, weeks (weeks pregnant), ' +
    'cycle_question (asks about her next period), health_question, smalltalk.\n' +
    'date is today, yesterday, days_ago (with n) or unknown. Leave out what she did not say.\n\n' +
    'Message: "Niregla ako kahapon, medyo malakas"\n' +
    '{"actions":[{"tool":"period_start","date":"yesterday","flow":"heavy"}]}\n' +
    'Message: "pagod at stressed ako ngayon"\n' +
    '{"actions":[{"tool":"moods","date":"today","moods":["tired","stressed"]}]}\n' +
    'Message: "kumusta"\n' +
    '{"actions":[{"tool":"smalltalk"}]}\n\n' +
    `Message: "${text.replace(/"/g, "'")}"`
  );
}

// Errors and timeouts mean no actions; the word rules have already read what they could.
export async function routeWithGemma(text: string): Promise<AgentAction[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ROUTER_TIMEOUT_MS);
  });
  try {
    const raw = await Promise.race([runJson(routerPrompt(text), ROUTER_SCHEMA, ROUTER_TIMEOUT_MS), timeout]);
    return parseActions(raw);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
