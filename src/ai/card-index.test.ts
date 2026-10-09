import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CARDS } from '../content/cards';

const embed = vi.fn();
const loadEmbedder = vi.fn();
vi.mock('./embedder', () => ({ loadEmbedder: () => loadEmbedder() }));

// A fake embedder: the card about any concern and the question about worry share a direction.
const vectorFor = (text: string) =>
  /concern|worried|nag-aalala/.test(text) ? [1, 0, 0] : /medication|gamot/i.test(text) ? [0, 0, 1] : [0, 1, 0];

describe('card index', () => {
  beforeEach(() => {
    vi.resetModules();
    embed.mockReset().mockImplementation(async (text: string) => vectorFor(text));
    loadEmbedder.mockReset().mockResolvedValue({ embed, release: vi.fn() });
  });

  it('finds the reviewed card closest in meaning to her message', async () => {
    const { retrieveCard } = await import('./card-index');
    const id = await retrieveCard('nag-aalala ako sa baby ko', { status: 'pregnant' });
    expect(id).toBe('pcpnc-m2-any-concern');
  });

  it('embeds the cards once and reuses them for later messages', async () => {
    const { retrieveCard } = await import('./card-index');
    await retrieveCard('nag-aalala ako', { status: 'pregnant' });
    await retrieveCard('nag-aalala pa rin ako', { status: 'pregnant' });
    expect(embed).toHaveBeenCalledTimes(CARDS.filter((c) => !/medication/.test(c.id)).length + 2);
  });

  it('ranks the closest cards with their scores, for tuning the threshold on the phone', async () => {
    const { rankCards } = await import('./card-index');
    const ranked = await rankCards('nag-aalala ako', { status: 'pregnant' }, 3);
    expect(ranked[0]).toEqual({ id: 'pcpnc-m2-any-concern', score: expect.closeTo(1, 5) });
    expect(ranked).toHaveLength(3);
  });

  it('never offers a medication card as a calm answer, since medicine advice is out of scope', async () => {
    const { retrieveCard } = await import('./card-index');
    const id = await retrieveCard('pwede ba akong uminom ng gamot', { status: 'pregnant' });
    expect(id ?? '').not.toMatch(/medication/);
  });

  it('shows no card when she is neither pregnant nor recently gave birth', async () => {
    const { retrieveCard } = await import('./card-index');
    expect(await retrieveCard('nag-aalala ako', { status: 'neither' })).toBeNull();
  });
});
