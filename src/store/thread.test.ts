import { describe, expect, it } from 'vitest';
import { recentTurns } from './thread';

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

  it('keeps only the last six turns and shortens long ones', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ role: 'her' as const, text: `m${i}` }));
    expect(recentTurns(many).map((t) => t.text)).toEqual(['m3', 'm4', 'm5', 'm6', 'm7', 'm8']);
    expect(recentTurns([{ role: 'her', text: 'x'.repeat(400) }])[0]!.text.length).toBeLessThanOrEqual(161);
  });
});
