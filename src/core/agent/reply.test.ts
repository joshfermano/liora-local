import { describe, expect, it } from 'vitest';
import { guardReply } from './reply';
import type { Facts } from './types';

const nothingDone: Facts = { symptoms: ['headache'], weeks: 30, saved: [], no_action_taken: true };
const saved: Facts = { symptoms: ['headache'], weeks: 30, saved: ['symptoms: headache on 2026-10-10'] };

describe('guardReply drops what Liora must never say', () => {
  it.each([
    'Baby is likely fine.',
    'Everything looks good.',
    'No need to be concerned.',
    'That is very common in pregnancy.',
    'It will pass soon.',
    'Mawawala din yan.',
  ])('reassurance: %s', (s) => expect(guardReply(s, nothingDone)).toBeNull());

  it.each([
    'Stay hydrated.',
    'Rest well tonight.',
    'Paracetamol helps.',
    'Ibuprofen is not recommended.',
    'Call emergency services if it gets worse.',
    'Talk to your midwife.',
    'Please see a nurse soon.',
  ])('advice: %s', (s) => expect(guardReply(s, nothingDone)).toBeNull());

  it.each(['Logged!', 'Your headache has been logged.', 'Na-log na yan!', 'Noted, saved for today.'])(
    'a save that did not happen: %s',
    (s) => expect(guardReply(s, nothingDone)).toBeNull(),
  );

  it.each(['I will remind you tomorrow.', 'I have told your contact.', "I'll text your husband for you."])(
    'an action Liora has no tool for, even after a save: %s',
    (s) => expect(guardReply(s, saved)).toBeNull(),
  );
});

describe('guardReply keeps warm, factual sentences', () => {
  it.each([
    "Thank you for telling me, I'm here with you.",
    'Salamat sa pag-share mo!',
    'You are 30 weeks along.',
    'How are you feeling today?',
    'Good morning!',
  ])('%s', (s) => expect(guardReply(s, nothingDone)).toBe(s));

  it('keeps a true save', () => {
    expect(guardReply('Logged it for today.', saved)).toBe('Logged it for today.');
  });
});
