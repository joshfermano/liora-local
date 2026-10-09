import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CARDS } from '../content/cards';

const disk = new Map<string, string>();
const storage = {
  getItem: async (k: string) => disk.get(k) ?? null,
  setItem: async (k: string, v: string) => void disk.set(k, v),
};
const load = async (): Promise<typeof import('./card-index')> => {
  const mod = await import('./card-index');
  mod.setCardVectorStorage(storage);
  return mod;
};

const embed = vi.fn();
const loadEmbedder = vi.fn();
vi.mock('./embedder', () => ({ loadEmbedder: () => loadEmbedder() }));

// A fake embedder: the card about any concern and the question about worry share a direction.
const vectorFor = (text: string) =>
  /concern|worried|nag-aalala/.test(text) ? [1, 0, 0] : /medication|gamot/i.test(text) ? [0, 0, 1] : [0, 1, 0];

describe('card index', () => {
  beforeEach(() => {
    vi.resetModules();
    disk.clear();
    embed.mockReset().mockImplementation(async (text: string) => vectorFor(text));
    loadEmbedder.mockReset().mockResolvedValue({ embed, release: vi.fn() });
  });

  it('finds the reviewed card closest in meaning to her message', async () => {
    const { retrieveCard } = await load();
    const id = await retrieveCard('nag-aalala ako sa baby ko', { status: 'pregnant' });
    expect(id).toBe('pcpnc-m2-any-concern');
  });

  it('embeds the cards once and reuses them for later messages', async () => {
    const { retrieveCard } = await load();
    await retrieveCard('nag-aalala ako', { status: 'pregnant' });
    await retrieveCard('nag-aalala pa rin ako', { status: 'pregnant' });
    expect(embed).toHaveBeenCalledTimes(CARDS.filter((c) => !/medication/.test(c.id)).length + 2);
  });

  it('keeps the card vectors, so the next launch embeds nothing but her message', async () => {
    const cards = CARDS.filter((c) => !/medication/.test(c.id)).length;
    const first = await load();
    await first.retrieveCard('nag-aalala ako', { status: 'pregnant' });
    expect(embed).toHaveBeenCalledTimes(cards + 1);
    expect(disk.get('tell-liora-card-vectors')).toBeDefined();

    vi.resetModules();
    embed.mockClear();
    const relaunched = await load();
    expect(await relaunched.retrieveCard('nag-aalala ako', { status: 'pregnant' })).toBe('pcpnc-m2-any-concern');
    expect(embed).toHaveBeenCalledTimes(1);
  });

  it('embeds again only the card whose text changed since the last launch', async () => {
    const first = await load();
    await first.retrieveCard('nag-aalala ako', { status: 'pregnant' });
    const saved = JSON.parse(disk.get('tell-liora-card-vectors')!);
    saved.cards['pcpnc-m2-any-concern'].key = 'stale';
    disk.set('tell-liora-card-vectors', JSON.stringify(saved));

    vi.resetModules();
    embed.mockClear();
    const relaunched = await load();
    await relaunched.retrieveCard('nag-aalala ako', { status: 'pregnant' });
    expect(embed).toHaveBeenCalledTimes(2);
  });

  it('still searches when the saved vectors cannot be read or written', async () => {
    disk.set('tell-liora-card-vectors', 'garbage');
    const { retrieveCard } = await load();
    expect(await retrieveCard('nag-aalala ako', { status: 'pregnant' })).toBe('pcpnc-m2-any-concern');
  });

  it('ranks the closest cards with their scores, for tuning the threshold on the phone', async () => {
    const { rankCards } = await load();
    const ranked = await rankCards('nag-aalala ako', { status: 'pregnant' }, 3);
    expect(ranked[0]).toEqual({ id: 'pcpnc-m2-any-concern', score: expect.closeTo(1, 5) });
    expect(ranked).toHaveLength(3);
  });

  it('never offers a medication card as a calm answer, since medicine advice is out of scope', async () => {
    const { retrieveCard } = await load();
    const id = await retrieveCard('pwede ba akong uminom ng gamot', { status: 'pregnant' });
    expect(id ?? '').not.toMatch(/medication/);
  });

  it('shows no card when she is neither pregnant nor recently gave birth', async () => {
    const { retrieveCard } = await load();
    expect(await retrieveCard('nag-aalala ako', { status: 'neither' })).toBeNull();
  });
});
