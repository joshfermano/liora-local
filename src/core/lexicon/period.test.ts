import { describe, expect, it } from 'vitest';
import { readPeriod } from './period';

const now = new Date('2026-10-09T15:00:00+08:00');

describe('readPeriod', () => {
  it('reads a period that started yesterday, with the date to confirm', () => {
    expect(readPeriod('Nagsimula regla ko kahapon', now)).toEqual({
      event: 'started', when: 'yesterday', days_ago: 1, date: '2026-10-08', flow: null,
    });
  });

  it('reads today and a number of days ago', () => {
    expect(readPeriod('dumating na regla ko ngayon', now)).toMatchObject({ event: 'started', when: 'today', date: '2026-10-09' });
    expect(readPeriod('nagsimula mens ko 3 araw na ang nakalipas', now)).toMatchObject({ when: 'days_ago', days_ago: 3, date: '2026-10-06' });
  });

  it('reads an ended period and the flow', () => {
    expect(readPeriod('natapos na regla ko kahapon', now)).toMatchObject({ event: 'ended', date: '2026-10-08' });
    expect(readPeriod('may regla ako, malakas', now)).toMatchObject({ event: 'ongoing', flow: 'heavy' });
  });

  it('finds no period in a message about something else', () => {
    expect(readPeriod('masakit ulo ko', now)).toBeNull();
  });

  it('leaves the date empty when the message does not say when', () => {
    expect(readPeriod('nagsimula na regla ko', now)).toMatchObject({ when: 'unknown', date: null });
  });
});
