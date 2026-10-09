import { describe, expect, it } from 'vitest';
import { readActions } from './index';
import { triage } from './triage';

// Everyday ways she might say her period started, in Tagalog, Taglish and English. A phrase missed here
// only means the calendar is not offered; it can no longer raise a false alarm (rules/who.ts).
export const PERIOD_STARTS = [
  'nagsimula regla ko',
  'nagsimula na ang regla ko kanina',
  'nagsimula na ang mens ko',
  'niregla ako kanina',
  'nireregla ako ngayon',
  'may regla na ako',
  'nagkaregla ako kahapon',
  'nagkaroon na ako ng regla',
  'dinatnan ako ngayong umaga',
  'dinalaw ako',
  'dumating na regla ko',
  'dumating na ang dalaw ko',
  'dumating na yung period ko',
  'nag-mens na ako',
  'may mens ako ngayon',
  'may period na ako',
  'nagka-period ako kahapon',
  'nag-start period ko today',
  'nag-start na mens ko kahapon',
  'first day ng regla ko ngayon',
  'unang araw ng regla ko',
  'day 1 ng period ko',
  'got my period today',
  'my period started yesterday',
  'I started my period this morning',
  'my period came today',
  "I'm on my period",
];

const missed = () => PERIOD_STARTS.filter((text) => !readActions(text, '2026-10-10').some((a) => a.tool === 'period_start'));

describe('period start phrasings', () => {
  it('reads every everyday way of saying her period started', () => {
    expect(missed()).toEqual([]);
  });
  it('does not read "not yet" or a question as a start', () => {
    for (const text of ['wala pa akong regla', 'hindi pa ako dinatnan', 'my period has not started yet', 'wala akong mens', 'kailan regla ko?', 'first day ng regla ko kailan?']) {
      expect(readActions(text, '2026-10-10').some((a) => a.tool === 'period_start')).toBe(false);
    }
  });
  it('skips the bleeding question for a recognised period log only when she is neither', () => {
    // Bleeding stays a danger sign for every status (rules/who.ts); only a clear period log narrows the check.
    expect(triage('Nagsimula regla ko ngayon', '2026-10-10', 'neither').typed).toBe('no_bleeding');
    expect(triage('Nagsimula regla ko ngayon', '2026-10-10', 'pregnant').typed).toBe('all');
    expect(triage('Nagsimula regla ko ngayon', '2026-10-10', undefined).typed).toBe('all');
  });
});

