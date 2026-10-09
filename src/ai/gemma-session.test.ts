import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadGemma = vi.fn();
vi.mock('./gemma-native', () => ({ loadGemma: () => loadGemma() }));

const fakeGemma = (answers: Record<string, number[]>) => ({
  loadMs: 1,
  gpu: true,
  reasonNoGPU: '',
  decide: vi.fn(async () => ({ answers, skipped: [], ms: 1 })),
  release: vi.fn(async () => {}),
});

describe('gemma session', () => {
  beforeEach(async () => {
    vi.resetModules();
    loadGemma.mockReset();
  });

  it('loads Gemma once and shares it', async () => {
    loadGemma.mockResolvedValue(fakeGemma({}));
    const { gemmaSession } = await import('./gemma-session');
    const [a, b] = await Promise.all([gemmaSession(), gemmaSession()]);
    expect(a).toBe(b);
    expect(loadGemma).toHaveBeenCalledTimes(1);
  });

  it('tries again after a failed load', async () => {
    loadGemma.mockRejectedValueOnce(new Error('no model file')).mockResolvedValueOnce(fakeGemma({}));
    const { gemmaSession } = await import('./gemma-session');
    await expect(gemmaSession()).rejects.toThrow('no model file');
    await expect(gemmaSession()).resolves.toBeDefined();
  });

  it('answers the typed questions with the shared session', async () => {
    loadGemma.mockResolvedValue(fakeGemma({ 'yesno.fever': [0.9, 0.1] }));
    const { askGemma } = await import('./gemma-session');
    await expect(askGemma('nilalagnat ako')).resolves.toEqual({ 'yesno.fever': [0.9, 0.1] });
  });

  it('releases the session so the next use loads again', async () => {
    const first = fakeGemma({});
    loadGemma.mockResolvedValueOnce(first).mockResolvedValueOnce(fakeGemma({}));
    const { gemmaSession, releaseGemma } = await import('./gemma-session');
    await gemmaSession();
    await releaseGemma();
    expect(first.release).toHaveBeenCalled();
    await gemmaSession();
    expect(loadGemma).toHaveBeenCalledTimes(2);
  });
});
