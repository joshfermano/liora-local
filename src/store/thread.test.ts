import { describe, expect, it } from 'vitest';
import { isNewConversation, recentTurns } from './thread';

describe('recentTurns', () => {
  it('reads Gemma text, the fixed fallback and old fixed lines, newest last', () => {
    const turns = recentTurns([
      { role: 'her', text: 'Hi' },
      { role: 'liora', blocks: [{ kind: 'reply', text: null, fallback: { key: 'reply.greeting', params: { name: 'Ana' } } }] },
      { role: 'her', text: 'Niregla ako' },
      { role: 'liora', blocks: [{ kind: 'decision', entryId: 'e', level: 'ok' }, { kind: 'reply', text: 'Nai-save ko na!', fallback: { key: 'reply.saved' } }] },
      { role: 'liora', blocks: [{ kind: 'text', key: 'companion.other' }] },
      { role: 'liora', blocks: [{ kind: 'decision', entryId: 'e', level: 'go_now' }] },
    ]);
    expect(turns).toEqual([
      { role: 'her', text: 'Hi' },
      { role: 'liora', text: 'Hi, Ana! What would you like to log or ask today?' },
      { role: 'her', text: 'Niregla ako' },
      { role: 'liora', text: 'Nai-save ko na!' },
      { role: 'liora', text: 'Tell me how you feel, log your period, or ask about your cycle.' },
    ]);
  });

  it('keeps only the last ten turns and shortens long ones', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ role: 'her' as const, text: `m${i}` }));
    expect(recentTurns(many).map((t) => t.text)).toEqual(['m2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11']);
    expect(recentTurns([{ role: 'her', text: 'x'.repeat(400) }])[0]!.text.length).toBeLessThanOrEqual(161);
  });
});

describe('the current conversation', () => {
  const now = new Date('2026-10-10T04:40:00Z');
  it('remembers the last turns whatever their age', () => {
    const turns = recentTurns(
      [
        { role: 'her', text: 'yesterday', at: '2026-10-09T10:00:00Z' },
        { role: 'her', text: 'just now', at: '2026-10-10T04:35:00Z' },
      ],
      now,
    );
    expect(turns.map((t) => t.text)).toEqual(['yesterday', 'just now']);
  });
  it('starts a new conversation after 30 minutes of quiet, so only then does Liora greet', () => {
    expect(isNewConversation([{ role: 'her', text: 'old', at: '2026-10-10T03:00:00Z' }], now)).toBe(true);
    expect(isNewConversation([{ role: 'her', text: 'hi', at: '2026-10-10T04:30:00Z' }], now)).toBe(false);
    expect(isNewConversation([], now)).toBe(true);
  });
});
