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
  it('starts speech after 300 ms well above the room', () => {
    const v = createVad();
    feed(v, 0, 300, -55);
    expect(v.push(-20, 400)).toBe('waiting');
    expect(v.push(-20, 600)).toBe('waiting');
    expect(v.push(-20, 700)).toBe('speech');
  });
  it('ends 700 ms after she goes quiet, not before', () => {
    const v = createVad();
    feed(v, 0, 300, -55);
    feed(v, 400, 500, -20);
    expect(v.push(-55, 1000)).toBe('speech');
    expect(v.push(-55, 1600)).toBe('speech');
    expect(v.push(-55, 1700)).toBe('end');
  });
  it('a sample that is still her voice restarts the quiet count', () => {
    const v = createVad();
    feed(v, 0, 300, -60);
    feed(v, 400, 500, -20);
    v.push(-60, 1000);
    v.push(-30, 1500);
    expect(v.push(-60, 1600)).toBe('speech');
    expect(v.push(-60, 2200)).toBe('speech');
    expect(v.push(-60, 2300)).toBe('end');
  });
  it('hears her stop in a room full of chatter', () => {
    const v = createVad();
    for (let t = 0; t <= 3000; t += 100) v.push(t % 300 === 0 ? -42 : -38, t);
    expect(feed(v, 3100, 1000, -15)).toBe('speech');
    expect(feed(v, 4200, 600, -38)).toBe('speech');
    expect(v.push(-38, 4900)).toBe('end');
  });
  it('does not take steady background noise for speech', () => {
    const v = createVad();
    for (let t = 0; t <= 3000; t += 100) expect(v.push(t % 200 === 0 ? -35 : -30, t)).toBe('waiting');
  });
  it("skips the recorder's start-up readings, which are not the room", () => {
    const v = createVad();
    feed(v, 0, 200, -160);
    feed(v, 300, 300, -55);
    expect(feed(v, 700, 400, -20)).toBe('speech');
  });
  it('ends at 30 s of speech', () => {
    const v = createVad();
    feed(v, 0, 300, -55);
    expect(feed(v, 400, 29_500, -20)).toBe('speech');
    expect(v.push(-20, 30_400)).toBe('end');
  });
  it('stays ended until reset, then waits again', () => {
    const v = createVad();
    feed(v, 0, 300, -55);
    feed(v, 400, 500, -20);
    feed(v, 1000, 800, -55);
    expect(v.push(-20, 2000)).toBe('end');
    v.reset();
    expect(v.push(-20, 0)).toBe('waiting');
  });
});
