import { describe, expect, it } from 'vitest';
import { CARDS } from './cards';
import { groupSources, parseCardTitle, passageLabel, SOURCES } from './sources';

describe('sources', () => {
  it('splits a WHO card title into organisation, document, year and place', () => {
    expect(
      parseCardTitle('WHO, Pregnancy, childbirth, postpartum and newborn care: a guide for essential practice, 3rd edition (2015), M2, p. 163'),
    ).toEqual({
      org: 'WHO',
      title: 'Pregnancy, childbirth, postpartum and newborn care: a guide for essential practice, 3rd edition',
      year: 2015,
      where: 'M2, p. 163',
    });
  });

  it('gives no year when the title has none, and does not invent one', () => {
    expect(parseCardTitle('DOH, Mother and Child Book (Philippines), p. 4')).toEqual({
      org: 'DOH',
      title: 'Mother and Child Book (Philippines)',
      year: null,
      where: 'p. 4',
    });
  });

  it('groups every card under exactly one document, by its URL', () => {
    expect(SOURCES.flatMap((s) => s.cards)).toHaveLength(CARDS.length);
    expect(new Set(SOURCES.map((s) => s.url)).size).toBe(SOURCES.length);
    for (const s of SOURCES) for (const c of s.cards) expect(c.source).toBe(s.url);
  });

  it('lists the WHO digital adaptation kit with the rules that use it', () => {
    const dak = SOURCES.find((s) => s.rules.length > 0);
    expect(dak?.url).toBe('https://www.who.int/publications/i/item/9789240020306');
    expect(dak?.year).toBe(2021);
    expect(dak?.rules).toEqual(['ANC.DT.01', 'ANC.DT.17']);
    expect(dak?.cards).toEqual([]);
  });

  it('keeps each passage label to where it sits in the document', () => {
    expect(passageLabel(CARDS[0]!)).toBe('p. 4');
    expect(groupSources([])).toHaveLength(1);
  });

  it('never leaves a document without an organisation or a title', () => {
    for (const s of SOURCES) {
      expect(s.org).not.toBe('');
      expect(s.title).not.toBe('');
    }
  });
});
