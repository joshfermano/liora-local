import { beforeEach, describe, expect, it, vi } from 'vitest';

const modelBytesOnDisk = vi.fn();
const gemmaSession = vi.fn();
const setAskModel = vi.fn();
const setRetrieveCard = vi.fn();
const embedderBytesOnDisk = vi.fn();
const setRouteActions = vi.fn();
const setWarmLine = vi.fn();
vi.mock('./gemma-native', () => ({ modelBytesOnDisk: () => modelBytesOnDisk() }));
vi.mock('./embedder', () => ({ embedderBytesOnDisk: () => embedderBytesOnDisk() }));
vi.mock('./card-index', () => ({ retrieveCard: vi.fn() }));
vi.mock('./gemma-session', () => ({ gemmaSession: () => gemmaSession(), askGemma: vi.fn(), askIntent: vi.fn() }));
vi.mock('./agent-router', () => ({ routeWithGemma: vi.fn() }));
vi.mock('./warm', () => ({ warmLine: vi.fn() }));
vi.mock('../store/agent', () => ({ setRouteActions: (...a: unknown[]) => setRouteActions(...a), setWarmLine: (...a: unknown[]) => setWarmLine(...a) }));
vi.mock('../store/companion', () => ({ setAskIntent: vi.fn() }));
vi.mock('../store/tell', () => ({
  setAskModel: (...args: unknown[]) => setAskModel(...args),
  setRetrieveCard: (...args: unknown[]) => setRetrieveCard(...args),
}));

describe('bootGemma', () => {
  beforeEach(() => {
    modelBytesOnDisk.mockReset();
    gemmaSession.mockReset().mockResolvedValue({});
    setAskModel.mockReset();
    setRetrieveCard.mockReset();
    embedderBytesOnDisk.mockReset().mockReturnValue(0);
  });

  it('hands card search to the tell flow when the small embedding model is on the phone', async () => {
    modelBytesOnDisk.mockReturnValue(0);
    embedderBytesOnDisk.mockReturnValue(276_000_000);
    const { bootGemma } = await import('./gemma-boot');
    bootGemma();
    expect(setRetrieveCard).toHaveBeenCalledWith(expect.any(Function));
  });

  it('leaves card search off when the embedding model is not downloaded', async () => {
    modelBytesOnDisk.mockReturnValue(0);
    const { bootGemma } = await import('./gemma-boot');
    bootGemma();
    expect(setRetrieveCard).toHaveBeenCalledWith(null);
  });

  it('hands Gemma to the tell flow and starts loading it when the model is on the phone', async () => {
    modelBytesOnDisk.mockReturnValue(2_841_481_184);
    const { bootGemma } = await import('./gemma-boot');
    expect(bootGemma()).toBe(true);
    expect(setAskModel).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ role: 'llm' }));
    expect(setRouteActions).toHaveBeenCalledWith(expect.any(Function));
    expect(setWarmLine).toHaveBeenCalledWith(expect.any(Function));
    expect(gemmaSession).toHaveBeenCalledTimes(1);
  });

  it('leaves the word list alone when the model is not downloaded', async () => {
    modelBytesOnDisk.mockReturnValue(0);
    const { bootGemma } = await import('./gemma-boot');
    expect(bootGemma()).toBe(false);
    expect(setAskModel).toHaveBeenCalledWith(null);
    expect(setRouteActions).toHaveBeenCalledWith(null);
    expect(setWarmLine).toHaveBeenCalledWith(null);
    expect(gemmaSession).not.toHaveBeenCalled();
  });

  it('keeps the app running when the warm-up load fails', async () => {
    modelBytesOnDisk.mockReturnValue(1);
    gemmaSession.mockRejectedValue(new Error('out of memory'));
    const { bootGemma } = await import('./gemma-boot');
    expect(() => bootGemma()).not.toThrow();
  });
});
