// What one agent turn did, collected while it runs and written to the trace when it ends. It holds
// counts, times and names only, never her words. Outside a turn every call does nothing.
export type Stage = 'triage' | 'typed' | 'route' | 'reply';
export type CacheName = 'typed' | 'context' | 'cards';

export interface Draft {
  purpose: string;
  typedScope: string;
  tools: string[];
  cacheHits: Set<CacheName>;
  ms: Record<Stage, number>;
  guardDropped: number;
  fallback: boolean;
  // Prompt id to the version used this turn.
  prompts: Record<string, string>;
}

let current: Draft | null = null;

export function beginProbe(): void {
  current = {
    purpose: 'unclear',
    typedScope: 'all',
    tools: [],
    cacheHits: new Set(),
    ms: { triage: 0, typed: 0, route: 0, reply: 0 },
    guardDropped: 0,
    fallback: true,
    prompts: {},
  };
}

export function endProbe(): Draft | null {
  const done = current;
  current = null;
  return done;
}

export function noteTurn(patch: Partial<Pick<Draft, 'purpose' | 'typedScope' | 'tools' | 'fallback'>>): void {
  if (current) Object.assign(current, patch);
}

export function noteHit(name: CacheName): void {
  current?.cacheHits.add(name);
}

export function notePrompt(id: string, version: string): void {
  if (current) current.prompts[id] = version;
}

export function noteDropped(count: number): void {
  if (current) current.guardDropped += count;
}

// Adds to the stage so a stage that runs twice in one turn still sums.
export async function timed<T>(stage: Stage, run: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await run();
  } finally {
    if (current) current.ms[stage] += Date.now() - started;
  }
}

export function timedSync<T>(stage: Stage, run: () => T): T {
  const started = Date.now();
  try {
    return run();
  } finally {
    if (current) current.ms[stage] += Date.now() - started;
  }
}
