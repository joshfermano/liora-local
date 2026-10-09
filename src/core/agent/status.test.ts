import { describe, expect, it } from 'vitest';
import { planActions, readActions, type AgentData } from './index';

const TODAY = '2026-10-10';
const status = (text: string) => {
  const a = readActions(text, TODAY).find((x) => x.tool === 'set_status');
  return a?.tool === 'set_status' ? a.status : undefined;
};
const empty: AgentData = { periods: [], dayLogs: [], cycleSettings: {}, setup: null };

describe('reading her status from what she says', () => {
  it.each(['buntis ako', 'Buntis na ako!', 'nagdadalang-tao ako', "I'm pregnant", 'I am pregnant', 'positive ang PT ko'])('reads "%s" as pregnant', (text) =>
    expect(status(text)).toBe('pregnant'),
  );
  it.each(['nanganak na ako', 'I gave birth last week', 'kakapanganak ko lang'])('reads "%s" as just gave birth', (text) => expect(status(text)).toBe('postpartum'));
  it.each(['hindi ako buntis', "I'm not pregnant", 'negative ang PT ko'])('reads "%s" as neither', (text) => expect(status(text)).toBe('neither'));
  it.each(['buntis ba ako?', 'am I pregnant?', 'masakit ulo ko', 'pwede ba mag-kape ang buntis?'])('leaves "%s" alone', (text) => expect(status(text)).toBeUndefined());

  it('asks before changing her status, and not at all when it already is', () => {
    const actions = readActions('buntis ako', TODAY);
    expect(planActions(actions, empty, 'neither', TODAY).confirm.map((a) => a.tool)).toContain('set_status');
    expect(planActions(actions, empty, 'pregnant', TODAY).confirm.map((a) => a.tool)).not.toContain('set_status');
  });
});
