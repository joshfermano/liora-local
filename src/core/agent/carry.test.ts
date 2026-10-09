import { describe, expect, it } from 'vitest';
import { carryOver, continuesTopic } from './carry';
import type { SavedItem } from './types';

const TODAY = '2026-10-10';
const HEADACHE: SavedItem[] = [{ kind: 'symptoms', date: TODAY, values: ['headache'] }];
const START: SavedItem[] = [{ kind: 'period_start', date: '2026-10-09' }];
const TODAY_START: SavedItem[] = [{ kind: 'period_start', date: TODAY }];

describe('carrying the last turn into a short reply', () => {
  it.each(['pati kahapon', 'kahapon din', 'and yesterday too', 'same yesterday', 'ganun din kahapon'])('logs the same again for "%s"', (text) => {
    expect(carryOver(text, HEADACHE, TODAY)).toEqual([{ tool: 'symptoms', date: { kind: 'date', date: '2026-10-09' }, symptoms: ['headache'] }]);
  });

  it.each(['mali, kahapon pala', 'kahapon pala', 'actually it was yesterday', 'no, yesterday', 'sorry, kahapon'])('moves it for "%s"', (text) => {
    expect(carryOver(text, TODAY_START, TODAY)).toEqual([
      { tool: 'undo_last' },
      { tool: 'period_start', date: { kind: 'date', date: '2026-10-09' }, flow: null },
    ]);
  });

  it.each(['natapos na ngayon', 'tapos na', 'it ended today', 'huminto na'])('ends the period she just logged for "%s"', (text) => {
    expect(carryOver(text, START, TODAY)).toEqual([{ tool: 'period_end', date: { kind: 'date', date: TODAY } }]);
  });

  it.each(['burahin mo', 'tanggalin mo yan', 'undo that', 'delete it', 'cancel'])('undoes it for "%s"', (text) => {
    expect(carryOver(text, HEADACHE, TODAY)).toEqual([{ tool: 'undo_last' }]);
  });

  it('does nothing without a log just before', () => {
    expect(carryOver('pati kahapon', [], TODAY)).toBeNull();
    expect(carryOver('burahin mo', [], TODAY)).toBeNull();
  });

  it('does nothing for a message that stands on its own', () => {
    expect(carryOver('masaya ako', HEADACHE, TODAY)).toBeNull();
    expect(carryOver('kailan next period ko?', START, TODAY)).toBeNull();
    expect(carryOver('tapos na', HEADACHE, TODAY)).toBeNull();
  });

  it('does not log the same day twice', () => {
    expect(carryOver('pati ngayon', HEADACHE, TODAY)).toBeNull();
  });
});

describe('a short question that follows her last message', () => {
  it.each(['bakit kaya?', 'ano pwede kong gawin?', 'why?', 'what can I do?', 'normal ba yun?', 'paano?', 'delikado ba yan?'])('continues the topic: "%s"', (text) => {
    expect(continuesTopic(text)).toBe(true);
  });

  it.each(['masakit ulo ko', 'who are you?', 'what is the capital of france?', 'kailan next period ko?', 'thanks'])('stands alone: "%s"', (text) => {
    expect(continuesTopic(text)).toBe(false);
  });
});
