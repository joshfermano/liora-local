import { describe, expect, it } from 'vitest';
import { hashText } from '../core/cache/hash';
import { fill, PROMPTS, promptVersions } from './prompts';

// Change a prompt, bump its version, then update the pin. A silent edit would leave the typed-answer
// cache and the traces claiming an older wording.
const PINNED: Record<keyof typeof PROMPTS, { version: string; hash: string }> = {
  persona: { version: '9', hash: '25d8vmu7g3o' },
  router: { version: '2', hash: '1yh1bhm4chu' },
  typed: { version: '1', hash: '1tam4g4r89d' },
  intent: { version: '1', hash: 'prjw53ojfu' },
  transcribe: { version: '1', hash: '1mm7oktkdsh' },
};

describe('prompt registry', () => {
  it('gives every prompt its own id, a version and text', () => {
    const ids = Object.values(PROMPTS).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [key, p] of Object.entries(PROMPTS)) {
      expect(p.id).toBe(key);
      expect(p.version).toMatch(/^\d+$/);
      expect(p.text.length).toBeGreaterThan(20);
    }
  });

  it.each(Object.keys(PINNED) as (keyof typeof PROMPTS)[])('%s: wording changes come with a new version', (id) => {
    const pin = PINNED[id];
    expect(PROMPTS[id].version === pin.version && hashText(PROMPTS[id].text) === pin.hash).toBe(true);
  });

  it('fills a slot once and leaves slot-looking words in her message alone', () => {
    expect(fill('Message: "{{message}}"', { message: 'hi {{question}} $& {{message}}' })).toBe('Message: "hi {{question}} $& {{message}}"');
    expect(fill('{{unknown}}', {})).toBe('{{unknown}}');
  });

  it('lists the versions of the prompts used', () => {
    expect(promptVersions(['typed', 'persona'])).toEqual({ typed: '1', persona: '9' });
    expect(promptVersions([])).toEqual({});
  });
});
