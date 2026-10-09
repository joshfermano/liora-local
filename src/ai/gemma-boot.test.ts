import { beforeEach, describe, expect, it, vi } from 'vitest';

const modelBytesOnDisk = vi.fn();
const gemmaSession = vi.fn();
const setAskModel = vi.fn();
vi.mock('./gemma-native', () => ({ modelBytesOnDisk: () => modelBytesOnDisk() }));
vi.mock('./gemma-session', () => ({ gemmaSession: () => gemmaSession(), askGemma: vi.fn() }));
vi.mock('../store/tell', () => ({ setAskModel: (...args: unknown[]) => setAskModel(...args) }));

describe('bootGemma', () => {
  beforeEach(() => {
    modelBytesOnDisk.mockReset();
    gemmaSession.mockReset().mockResolvedValue({});
    setAskModel.mockReset();
  });

  it('hands Gemma to the tell flow and starts loading it when the model is on the phone', async () => {
    modelBytesOnDisk.mockReturnValue(2_841_481_184);
    const { bootGemma } = await import('./gemma-boot');
    expect(bootGemma()).toBe(true);
    expect(setAskModel).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ role: 'llm' }));
    expect(gemmaSession).toHaveBeenCalledTimes(1);
  });

  it('leaves the word list alone when the model is not downloaded', async () => {
    modelBytesOnDisk.mockReturnValue(0);
    const { bootGemma } = await import('./gemma-boot');
    expect(bootGemma()).toBe(false);
    expect(setAskModel).toHaveBeenCalledWith(null);
    expect(gemmaSession).not.toHaveBeenCalled();
  });

  it('keeps the app running when the warm-up load fails', async () => {
    modelBytesOnDisk.mockReturnValue(1);
    gemmaSession.mockRejectedValue(new Error('out of memory'));
    const { bootGemma } = await import('./gemma-boot');
    expect(() => bootGemma()).not.toThrow();
  });
});
