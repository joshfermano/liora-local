import { describe, expect, it, vi } from 'vitest';
import { withRetries } from './retry';

describe('withRetries', () => {
  it('returns the first success', async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error('network connection was lost')).mockResolvedValueOnce('done');
    await expect(withRetries(task, { attempts: 3 })).resolves.toBe('done');
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('tells the caller about each retry', async () => {
    const onRetry = vi.fn();
    const task = vi.fn().mockRejectedValueOnce(new Error('lost')).mockResolvedValueOnce('ok');
    await withRetries(task, { attempts: 3, onRetry });
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('gives up after the last attempt with the last error', async () => {
    const task = vi.fn().mockRejectedValue(new Error('still offline'));
    await expect(withRetries(task, { attempts: 3 })).rejects.toThrow('still offline');
    expect(task).toHaveBeenCalledTimes(3);
  });
});
