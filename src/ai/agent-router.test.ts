import { beforeEach, describe, expect, it, vi } from 'vitest';

const runJson = vi.fn();
vi.mock('./gemma-session', () => ({ runJson: (...args: unknown[]) => runJson(...args), runSay: vi.fn() }));

import { parseActions, routeWithGemma, ROUTER_SCHEMA } from './agent-router';

describe('agent router', () => {
  beforeEach(() => {
    runJson.mockReset();
  });

  it('turns a valid reply into closed actions', () => {
    const out = parseActions({
      actions: [
        { tool: 'period_start', date: 'yesterday', flow: 'heavy' },
        { tool: 'moods', date: 'days_ago', n: 3, moods: ['tired', 'tired', 'sad'] },
        { tool: 'weeks', weeks: 24 },
        { tool: 'smalltalk' },
      ],
    });
    expect(out).toEqual([
      { tool: 'period_start', date: { kind: 'yesterday' }, flow: 'heavy' },
      { tool: 'moods', date: { kind: 'days_ago', n: 3 }, moods: ['tired', 'sad'] },
      { tool: 'weeks', weeks: 24 },
      { tool: 'smalltalk' },
    ]);
  });

  it('drops invalid items and keeps the rest', () => {
    const out = parseActions({
      actions: [
        { tool: 'diagnose', date: 'today' },
        { tool: 'symptoms', date: 'today', symptoms: ['severe_headache'] },
        { tool: 'symptoms', date: 'today', symptoms: [] },
        { tool: 'weeks', weeks: 80 },
        { tool: 'period_end', date: 'days_ago', n: 99 },
        { tool: 'flow', date: 'today' },
        { tool: 'symptoms', date: 'today', symptoms: ['cramps'] },
      ],
    });
    expect(out).toEqual([{ tool: 'symptoms', date: { kind: 'today' }, symptoms: ['cramps'] }]);
  });

  it('never lets a danger code through', () => {
    const text = JSON.stringify(ROUTER_SCHEMA);
    for (const code of ['vaginal_bleeding', 'convulsions', 'severe_headache', 'fever']) expect(text).not.toContain(code);
    expect(parseActions({ actions: [{ tool: 'symptoms', symptoms: ['convulsions', 'fever'] }] })).toEqual([]);
  });

  it('asks for an unknown date when the date is missing or incomplete', () => {
    expect(parseActions({ actions: [{ tool: 'period_end' }, { tool: 'period_end', date: 'days_ago' }] })).toEqual([
      { tool: 'period_end', date: { kind: 'unknown' } },
      { tool: 'period_end', date: { kind: 'unknown' } },
    ]);
  });

  it('gives nothing for a reply of the wrong shape', () => {
    for (const raw of [null, 'text', 3, {}, { actions: 'x' }]) expect(parseActions(raw)).toEqual([]);
  });

  it('gives nothing when the model fails', async () => {
    runJson.mockRejectedValue(new Error('no model'));
    expect(await routeWithGemma('hello')).toEqual([]);
  });

  it('gives nothing after the timeout', async () => {
    vi.useFakeTimers();
    runJson.mockReturnValue(new Promise(() => {}));
    const pending = routeWithGemma('hello');
    await vi.advanceTimersByTimeAsync(4100);
    expect(await pending).toEqual([]);
    vi.useRealTimers();
  });

  it('parses what the model returns', async () => {
    runJson.mockResolvedValue({ actions: [{ tool: 'cycle_question' }] });
    expect(await routeWithGemma('kailan next regla ko')).toEqual([{ tool: 'cycle_question' }]);
    expect(runJson.mock.calls[0]![1]).toBe(ROUTER_SCHEMA);
  });
});
