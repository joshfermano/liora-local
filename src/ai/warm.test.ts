import { beforeEach, describe, expect, it, vi } from 'vitest';

const runSay = vi.fn();
const guardWarm = vi.fn();
vi.mock('./gemma-session', () => ({ runJson: vi.fn(), runSay: (...args: unknown[]) => runSay(...args) }));
vi.mock('../core/agent', () => ({ guardWarm: (t: string) => guardWarm(t) }));

import { warmLine, warmMessages } from './warm';

const ctx = { name: 'Ana', saved: [] };

describe('warm line', () => {
  beforeEach(() => {
    runSay.mockReset();
    guardWarm.mockReset().mockImplementation((t: string) => t);
  });

  it('streams tokens and returns the guarded line', async () => {
    runSay.mockImplementation(async (_m: unknown, o: { onToken?: (t: string) => void }) => {
      o.onToken?.('Nandito');
      return 'Nandito lang ako, Ana.';
    });
    const seen: string[] = [];
    expect(await warmLine('pagod ako', 'tired', ctx, (t) => seen.push(t))).toBe('Nandito lang ako, Ana.');
    expect(seen).toEqual(['Nandito']);
    expect(runSay.mock.calls[0]![1]).toMatchObject({ nPredict: 48, temperature: 0.7 });
  });

  it('gives null when the guard rejects the line', async () => {
    runSay.mockResolvedValue('Take paracetamol');
    guardWarm.mockReturnValue(null);
    expect(await warmLine('masakit', 'worried', ctx)).toBeNull();
  });

  it('gives null on failure and after 3 seconds', async () => {
    runSay.mockRejectedValue(new Error('no model'));
    expect(await warmLine('hi', 'neutral', ctx)).toBeNull();
    vi.useFakeTimers();
    runSay.mockReturnValue(new Promise(() => {}));
    const pending = warmLine('hi', 'neutral', ctx);
    await vi.advanceTimersByTimeAsync(3100);
    expect(await pending).toBeNull();
    vi.useRealTimers();
  });

  it('keeps advice and what was saved out of the ask', () => {
    const [system, user] = warmMessages('pagod', 'tired', { name: 'Ana', saved: [{ kind: 'weeks', weeks: 12 }] });
    expect(system!.content).toMatch(/25 words/);
    expect(system!.content).toMatch(/never give advice/i);
    expect(user!.content).toMatch(/do not mention it/);
    expect(user!.content).not.toMatch(/12/);
  });
});
