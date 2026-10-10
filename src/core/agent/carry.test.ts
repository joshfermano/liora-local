import { describe, expect, it } from 'vitest';
import { carryOver, confirmAnswer, continuesTopic, corrects, dateAnswer, goAhead, needsDate, withDate } from './carry';
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

  it.each(['natapos na ngayon', 'it ended today'])('ends the period she just logged for "%s"', (text) => {
    expect(carryOver(text, START, TODAY)).toEqual([{ tool: 'period_end', date: { kind: 'date', date: TODAY } }]);
  });

  it.each(['tapos na', 'huminto na'])('ends it but asks which day for "%s"', (text) => {
    expect(carryOver(text, START, TODAY)).toEqual([{ tool: 'period_end', date: { kind: 'unknown' } }]);
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

  it('does not log the same day twice, and says so', () => {
    expect(carryOver('pati ngayon', HEADACHE, TODAY)).toEqual([]);
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

describe('a date given after Liora asked which day', () => {
  const waiting = [{ tool: 'period_start' as const, date: { kind: 'unknown' as const }, flow: null }];
  it.each([['kahapon', '2026-10-09'], ['kanina', TODAY], ['2 days ago', '2026-10-08'], ['noong Oct 7', '2026-10-07']])('fills "%s"', (text, date) => {
    expect(dateAnswer(text, waiting, TODAY)).toEqual([{ tool: 'period_start', date: { kind: 'date', date }, flow: null }]);
  });

  it('needs a bare date and something waiting', () => {
    expect(dateAnswer('masakit ulo ko kahapon', waiting, TODAY)).toBeNull();
    expect(dateAnswer('kahapon', [], TODAY)).toBeNull();
  });
});

describe('a correction of what Liora just saved', () => {
  it.each(['hindi pala, malungkot ako', 'actually I am tired', 'mali, masakit puson ko'])('hears "%s"', (text) => {
    expect(corrects(text, HEADACHE)).toBe(true);
  });

  it('needs something saved just before', () => {
    expect(corrects('hindi pala, malungkot ako', [])).toBe(false);
    expect(corrects('malungkot ako', HEADACHE)).toBe(false);
  });
});

describe('short replies that carry their own log', () => {
  it.each(['masaya din ako kahapon', 'nag-walk din ako kahapon', 'malakas din regla ko kahapon'])('logs her own words for "%s", not the last log again', (text) => {
    expect(carryOver(text, HEADACHE, TODAY)).toBeNull();
  });

  it('does not read "sorry" as taking the last log back', () => {
    expect(corrects('sorry, masakit puson ko', HEADACHE)).toBe(false);
  });
});

describe('a typed answer to "Shall I save this?"', () => {
  it.each(['oo', 'yes', 'ok', 'sige', 'save it', 'i-save mo', 'opo', 'yes please'])('"%s" saves', (text) => {
    expect(confirmAnswer(text)).toBe('yes');
  });

  it.each(['hindi', 'no', 'wag', 'huwag na', 'not now', 'cancel'])('"%s" does not', (text) => {
    expect(confirmAnswer(text)).toBe('no');
  });

  it.each(['oo masakit ulo ko', 'okay lang ba?', 'hindi ako buntis'])('"%s" is not a bare answer', (text) => {
    expect(confirmAnswer(text)).toBeNull();
  });
});

describe('a confirm that still needs its day', () => {
  const start = [{ tool: 'set_status' as const, status: 'neither' as const }, { tool: 'period_start' as const, date: { kind: 'unknown' as const }, flow: null }];

  it('knows the day is missing', () => {
    expect(needsDate(start)).toBe(true);
    expect(needsDate([{ tool: 'set_name', name: 'Bea' }])).toBe(false);
  });

  it('fills the missing day and leaves the rest', () => {
    expect(withDate(start, '2026-10-09')).toEqual([start[0], { tool: 'period_start', date: { kind: 'date', date: '2026-10-09' }, flow: null }]);
  });
});

describe('telling Liora to go ahead', () => {
  it.each(['do it then', 'do it', 'go ahead', 'yes please', 'sige na', 'gawin mo na', 'check it', 'tingnan mo na', 'ok do it', 'please do'])('"%s" means go ahead', (text) => {
    expect(goAhead(text)).toBe(true);
  });

  it.each(['do i have ovulation', 'masakit ulo ko', 'yes', 'ok', 'thank you', 'do it later'])('"%s" does not', (text) => {
    expect(goAhead(text)).toBe(false);
  });
});
