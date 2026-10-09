import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReplyRequest } from '../core/agent';

const runSay = vi.fn();
const guardReply = vi.fn();
vi.mock('./gemma-session', () => ({ runJson: vi.fn(), runSay: (...args: unknown[]) => runSay(...args) }));
vi.mock('../core/agent', () => ({ guardReply: (t: string, f: unknown) => guardReply(t, f) }));

import { beginProbe, endProbe } from '../core/probe';
import { completeSentences, PERSONA, replyMessages, REPLY_TIMEOUT_MS, sayReply } from './agent-loop';

const req = (over: Partial<ReplyRequest> = {}): ReplyRequest => ({
  text: 'Thank you!',
  pack: 'Her name is Gweny. Cycle day 3.',
  facts: { she_said: 'thank you' },
  allowed: { she_said: 'thank you', cycle_day: 3 },
  thread: [],
  ...over,
});

describe('reply prompt', () => {
  it('sets a smart, upbeat persona with the safety lines', () => {
    for (const phrase of [
      /smart, friendly companion/,
      /Filipino women/,
      /Tagalog, Taglish or English/,
      /exactly as written in HER DATA/,
      /never invent or calculate/,
      /never present a fertile window as birth control/,
      /medical advice, diagnoses, medicine or dose advice/,
      /reviewed source is shown below/,
      /Comfort her only when she says she is sad, scared or tired/,
      /do not tell her to breathe/,
    ]) {
      expect(PERSONA).toMatch(phrase);
    }
  });

  it('puts her data, what the tools did, the last turns and her message in the user turn', () => {
    const [system, user] = replyMessages(
      req({ thread: [{ role: 'her', text: 'Hi' }, { role: 'liora', text: 'Hi Gweny!' }] }),
    );
    expect(system).toEqual({ role: 'system', content: PERSONA });
    const body = user!.content;
    expect(body.indexOf('HER DATA:')).toBeLessThan(body.indexOf('WHAT YOU JUST DID:'));
    expect(body.indexOf('WHAT YOU JUST DID:')).toBeLessThan(body.indexOf('Recent chat'));
    expect(body.indexOf('Recent chat')).toBeLessThan(body.indexOf('Her message: Thank you!'));
    expect(body).toContain('Her name is Gweny. Cycle day 3.');
    expect(body).toContain('{"she_said":"thank you"}');
    expect(body).toContain('Her: Hi');
    expect(body).toContain('Liora: Hi Gweny!');
  });

  it('leaves out the chat and the data headings when there is nothing to say', () => {
    const body = replyMessages(req({ pack: '', thread: [] }))[1]!.content;
    expect(body).not.toContain('Recent chat');
    expect(body).not.toContain('HER DATA');
  });
});

describe('completeSentences', () => {
  it.each([
    ['Hi Gweny! What would', 'Hi Gweny!'],
    ['Hi Gweny! What would you like?', 'Hi Gweny!'],
    ['Hi Gweny! What would you like? ', 'Hi Gweny! What would you like?'],
    ['Your window is 2.5 days', ''],
    ['Done... okay', 'Done...'],
    ['', ''],
  ])('%s', (streamed, done) => expect(completeSentences(streamed)).toBe(done));
});

describe('sayReply', () => {
  beforeEach(() => {
    runSay.mockReset();
    guardReply.mockReset().mockImplementation((t: string) => t.trim() || null);
  });

  it('asks for up to 160 tokens and returns the guarded reply', async () => {
    runSay.mockResolvedValue('Anytime, Gweny!');
    expect(await sayReply(req())).toBe('Anytime, Gweny!');
    expect(runSay.mock.calls[0]![1]).toMatchObject({ nPredict: 160, temperature: 0.7, timeoutMs: REPLY_TIMEOUT_MS });
    expect(guardReply).toHaveBeenLastCalledWith('Anytime, Gweny!', req().allowed);
  });

  it('shows only whole sentences that passed the guard while it writes, never raw tokens', async () => {
    guardReply.mockImplementation((t: string) => (/Uminom/.test(t) ?t.replace(/Uminom ka ng tubig\.\s*/, '').trim() || null : t));
    runSay.mockImplementation(async (_m: unknown, o: { onToken: (t: string) => void }) => {
      for (const acc of ['Hi', 'Hi Gweny', 'Hi Gweny! Uminom ka', 'Hi Gweny! Uminom ka ng tubig. Ano ang', 'Hi Gweny! Uminom ka ng tubig. Ano ang gusto mo?']) o.onToken(acc);
      return 'Hi Gweny! Uminom ka ng tubig. Ano ang gusto mo?';
    });
    const shown: string[] = [];
    const final = await sayReply(req(), (t) => shown.push(t));
    expect(shown).toEqual(['Hi Gweny!']);
    expect(guardReply.mock.calls.map((c) => c[0])).not.toContain('Hi Gweny! Uminom ka');
    expect(final).toBe('Hi Gweny! Ano ang gusto mo?');
  });

  it('shows nothing when the guard rejects the first sentences', async () => {
    guardReply.mockReturnValue(null);
    runSay.mockImplementation(async (_m: unknown, o: { onToken: (t: string) => void }) => {
      o.onToken('Take paracetamol. Okay?');
      return 'Take paracetamol. Okay?';
    });
    const shown: string[] = [];
    expect(await sayReply(req(), (t) => shown.push(t))).toBeNull();
    expect(shown).toEqual([]);
  });

  it('keeps the guarded sentences already shown when it fails or runs out of time', async () => {
    runSay.mockImplementation(async (_m: unknown, o: { onToken: (t: string) => void }) => {
      o.onToken('Hi Gweny! Ano');
      throw new Error('The model took too long');
    });
    expect(await sayReply(req())).toBe('Hi Gweny!');

    vi.useFakeTimers();
    let late: (t: string) => void = () => {};
    runSay.mockImplementation((_m: unknown, o: { onToken: (t: string) => void }) => {
      o.onToken('Ayos! Next one.');
      late = o.onToken;
      return new Promise(() => {});
    });
    const shown: string[] = [];
    const pending = sayReply(req(), (t) => shown.push(t));
    await vi.advanceTimersByTimeAsync(REPLY_TIMEOUT_MS + 100);
    expect(await pending).toBe('Ayos!');
    late('Ayos! Next one. Too late. More');
    expect(shown).toEqual(['Ayos!']);
    vi.useRealTimers();
  });

  it('tells the turn trace the persona version and how many sentences the guard removed', async () => {
    runSay.mockResolvedValue('Ayos! Uminom ka ng tubig. Next one.');
    guardReply.mockImplementation((t: string) => t.replace('Uminom ka ng tubig. ', ''));
    beginProbe();
    await sayReply(req());
    const draft = endProbe()!;
    expect(draft.prompts).toEqual({ persona: '1' });
    expect(draft.guardDropped).toBe(1);
  });

  it('gives null on failure with nothing shown', async () => {
    runSay.mockRejectedValue(new Error('no model'));
    expect(await sayReply(req())).toBeNull();
  });
});
