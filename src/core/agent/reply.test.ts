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

  // Every tool already ran before Liora speaks, so an offer or promise can never be kept.
  it.each([
    'Since you asked about ovulation, I can look at your cycle data for you.',
    'Let me check your cycle.',
    "I'll look into that for you.",
    'Would you like me to calculate your fertile window?',
    'Do you want me to check your logs?',
    'Shall I look at your calendar?',
    'I can check that for you.',
    'Titingnan ko ang cycle mo.',
    'Hahanapin ko yan para sa iyo.',
    'Gusto mo bang tingnan ko ang logs mo?',
  ])('an offer or promise: %s', (s) => expect(guardReply(s, saved)).toBeNull());

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

describe('guardReply lets Liora name a symptom she logged herself', () => {
  const data = { her_data: 'Logged in the last 7 days:\n- Oct 10: flow medium; symptoms cramps, back pain, headache, bloating' };
  it('keeps "you logged a headache today"', () => {
    expect(guardReply('You logged a headache and cramps today.', data)).toBe('You logged a headache and cramps today.');
  });
  it('still drops calling it severe', () => {
    expect(guardReply('You have a severe headache.', data)).toBeNull();
  });
  it('still drops a symptom she did not log', () => {
    expect(guardReply('You logged a fever today.', data)).toBeNull();
  });
});

describe('the symptom twin is narrow', () => {
  it('does not let a logged symptom carry an unrelated danger sign', () => {
    const data = { her_data: 'symptoms cramps' };
    expect(guardReply('You logged cramps and you are vomiting a lot.', data)).toBeNull();
  });
});
