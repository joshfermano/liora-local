import { describe, expect, it, vi } from 'vitest';
import { lastResult } from './memo';

describe('lastResult', () => {
  it('does not compute again while every argument is the same object', () => {
    const compute = vi.fn((a: number[], day: string) => `${a.length} ${day}`);
    const call = lastResult(compute);
    const slice = [1, 2];
    expect(call(slice, 'Oct 10')).toEqual({ value: '2 Oct 10', hit: false });
    expect(call(slice, 'Oct 10')).toEqual({ value: '2 Oct 10', hit: true });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('computes again when a slice is replaced or the day changes', () => {
    const compute = vi.fn((a: number[], day: string) => `${a.length} ${day}`);
    const call = lastResult(compute);
    call([1], 'Oct 10');
    expect(call([1], 'Oct 10').hit).toBe(false);
    expect(call([1], 'Oct 11').hit).toBe(false);
    expect(compute).toHaveBeenCalledTimes(3);
  });

  it('forgets on reset', () => {
    const call = lastResult((n: number) => n * 2);
    call(2);
    call.reset();
    expect(call(2).hit).toBe(false);
  });
});
