import { describe, expect, it } from 'vitest';
import { createVad, type VadState } from './index';

const feed = (vad: ReturnType<typeof createVad>, from: number, ms: number, db: number): VadState => {
  let s: VadState = 'waiting';
  for (let t = from; t <= from + ms; t += 100) s = vad.push(db, t);
  return s;
};

describe('createVad', () => {
  it('stays waiting in quiet and for speech shorter than 300 ms', () => {
    const v = createVad();
    expect(feed(v, 0, 2000, -60)).toBe('waiting');
    expect(feed(v, 2100, 100, -20)).toBe('waiting');
    expect(v.push(-60, 2300)).toBe('waiting');
  });
  it('starts speech after 300 ms above -35 dBFS', () => {
    const v = createVad();
    expect(v.push(-20, 0)).toBe('waiting');
    expect(v.push(-20, 200)).toBe('waiting');
    expect(v.push(-20, 300)).toBe('speech');
  });
  it('ends after 1200 ms below -45 dBFS, not before', () => {
    const v = createVad();
    feed(v, 0, 500, -20);
    expect(v.push(-60, 600)).toBe('speech');
    expect(v.push(-60, 1700)).toBe('speech');
    expect(v.push(-60, 1800)).toBe('end');
  });
  it('a sample between -45 and -35 restarts the silence count', () => {
    const v = createVad();
    feed(v, 0, 500, -20);
    v.push(-60, 600);
    v.push(-40, 1200);
    expect(v.push(-60, 1300)).toBe('speech');
    expect(v.push(-60, 2400)).toBe('speech');
    expect(v.push(-60, 2500)).toBe('end');
  });
  it('ends at 30 s of speech', () => {
    const v = createVad();
    expect(feed(v, 0, 29900, -20)).toBe('speech');
    expect(v.push(-20, 30000)).toBe('end');
  });
  it('stays ended until reset, then waits again', () => {
    const v = createVad();
    feed(v, 0, 500, -20);
    feed(v, 600, 1300, -60);
    expect(v.push(-20, 2000)).toBe('end');
    v.reset();
    expect(v.push(-20, 0)).toBe('waiting');
  });
});
