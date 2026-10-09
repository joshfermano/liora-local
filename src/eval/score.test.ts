import { describe, expect, it } from 'vitest';
import type { Entry } from '../core/types';
import { parseCases, scoreRun, type EvalCase } from './score';

const entry = (level: Entry['decision']['level'], codes: string[]): Entry => ({
  id: 'e',
  created_at: '2026-10-10T00:00:00.000Z',
  text: 'x',
  input: 'text',
  findings: codes.map((code) => ({ code: code as never, severity: 'severe', sources: ['llm'], confidence: 0.9 })),
  extraction: null,
  decision: { level, fired: [] },
  card_ids: [],
  models: [],
});

const c = (id: string, expectLevel: EvalCase['expectLevel'], expectCodes: string[] = []): EvalCase => ({
  id,
  text: id,
  expectLevel,
  expectCodes: expectCodes as never,
});

describe('eval scoring', () => {
  it('counts a danger case that came out calm as missed, the number that must stay at zero', () => {
    const report = scoreRun([
      { case: c('a', 'go_now', ['fever']), entry: entry('ok', []) },
      { case: c('b', 'go_now', ['fever']), entry: entry('go_now', ['fever']) },
    ]);
    expect(report.dangerMissed).toEqual(['a']);
  });

  it('does not count a follow-up question as a miss, because it asks before deciding', () => {
    const report = scoreRun([{ case: c('a', 'go_now', ['severe_headache']), entry: entry('follow_up', ['severe_headache']) }]);
    expect(report.dangerMissed).toEqual([]);
  });

  it('reports how often the decision level matched', () => {
    const report = scoreRun([
      { case: c('a', 'ok'), entry: entry('ok', []) },
      { case: c('b', 'ok'), entry: entry('follow_up', ['severe_pain']) },
    ]);
    expect(report.levelMatched).toBe(1);
    expect(report.cases).toBe(2);
  });

  it('reports recall per danger sign', () => {
    const report = scoreRun([
      { case: c('a', 'go_now', ['fever']), entry: entry('go_now', ['fever']) },
      { case: c('b', 'go_now', ['fever', 'vaginal_bleeding']), entry: entry('go_now', ['fever']) },
    ]);
    expect(report.recall.fever).toEqual({ found: 2, expected: 2 });
    expect(report.recall.vaginal_bleeding).toEqual({ found: 0, expected: 1 });
  });

  it('reads the eval file and refuses a case with an unknown sign or level', () => {
    expect(parseCases([{ id: 'x', text: 'nilalagnat ako', expectLevel: 'go_now', expectCodes: ['fever'] }])).toHaveLength(1);
    expect(() => parseCases([{ id: 'x', text: 'a', expectLevel: 'maybe', expectCodes: [] }])).toThrow();
    expect(() => parseCases([{ id: 'x', text: 'a', expectLevel: 'ok', expectCodes: ['headache_ish'] }])).toThrow();
  });
});
