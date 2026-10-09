import { describe, expect, it } from 'vitest';
import { guardWarm, toneOf } from './index';
import type { Entry, Finding } from '../types';

const finding = (code: Finding['code']): Finding => ({ code, severity: 'unknown', sources: ['lexicon'], confidence: null });

const entry = (over: Partial<Entry> = {}): Entry =>
  ({ id: 'e', created_at: '2026-10-10T00:00:00Z', text: '', input: 'text', findings: [], extraction: null, decision: { level: 'ok', fired: [] }, card_ids: [], models: [], ...over }) as Entry;

describe('toneOf', () => {
  it('is worried on a danger finding or fear words', () => {
    expect(toneOf('dinudugo ako', entry({ findings: [finding('vaginal_bleeding')] }))).toBe('worried');
    expect(toneOf('natatakot ako', entry())).toBe('worried');
    expect(toneOf("I'm worried", entry())).toBe('worried');
  });
  it('is sad on a sad mood or sad words', () => {
    expect(toneOf('malungkot ako', entry())).toBe('sad');
    expect(toneOf('umiiyak ako', entry())).toBe('sad');
  });
  it('is tired on fatigue or tired words', () => {
    expect(toneOf('hmm', entry({ findings: [finding('fatigue')] }))).toBe('tired');
    expect(toneOf('pagod ako', entry())).toBe('tired');
  });
  it('is happy on joyful words or thanks', () => {
    expect(toneOf('masaya ako', entry())).toBe('happy');
    expect(toneOf('salamat', entry())).toBe('happy');
  });
  it('is neutral otherwise, and worried beats tired', () => {
    expect(toneOf('nag-walk ako', entry())).toBe('neutral');
    expect(toneOf('pagod ako at kinakabahan', entry())).toBe('worried');
  });
});

describe('guardWarm', () => {
  it.each(['Nandito ako. Salamat sa pagsabi.', "I'm here, and I'm glad you told me.", '  Narinig kita.  '])('passes a safe line: %s', (t) =>
    expect(guardWarm(t)).toBe(t.trim()),
  );
  it.each([
    ['empty', '   '],
    ['too long', 'a'.repeat(161)],
    ['uminom', 'Uminom ka muna ng tubig.'],
    ['doctor', 'Talk to your doctor.'],
    ['a digit', 'Nandito ako 24 hours.'],
    ['dugo', 'Nakita ko ang dugo.'],
    ['a url', 'Tingnan mo example.com'],
    ['a list', 'Nandito ako.\nNarinig kita.'],
    ['advice', 'You should rest.'],
    ['a symptom word', 'Masakit ang puson mo.'],
    ['a vocabulary label', 'Sorry about the headache.'],
    ['reassurance', "Okay ka lang, you're fine."],
    ['contraception', 'Try the pill.'],
  ])('rejects %s', (_n, t) => expect(guardWarm(t)).toBeNull());
});
