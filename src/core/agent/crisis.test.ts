import { describe, expect, it } from 'vitest';
import { mentionsSelfHarm } from './crisis';

describe('mentionsSelfHarm', () => {
  it.each([
    'gusto ko nang mamatay',
    'Ayoko na mabuhay',
    'ayaw ko nang mabuhay',
    'mas mabuti pang mamatay na lang ako',
    'gusto kong magpakamatay',
    'papatayin ko na sarili ko',
    'sasaktan ko ang sarili ko',
    'wala nang saysay ang buhay ko',
    'I want to die',
    'I want to kill myself',
    "I don't want to live anymore",
    'thinking of ending my life',
    'I might hurt myself',
    'suicidal ako',
    'ayoko na sa buhay ko',
    'pagod na ako sa buhay',
    'sobrang lungkot ko gusto ko na lang mawala',
    'sana mawala na lang ako',
    'sana hindi na ako magising',
    'ayoko nang gumising',
    'mas mabuti pa kung wala na ako',
    'I just want to disappear',
    'I wish I was dead',
    'everyone would be better off without me',
  ])('hears "%s"', (text) => expect(mentionsSelfHarm(text)).toBe(true));

  it.each(['masakit ulo ko', 'parang mamatay na ako sa sakit ng tiyan', 'sobrang lungkot ko', 'pagod na pagod ako', 'nasaktan ako sa sinabi niya', 'kill the pain please', 'gusto ko nang mawala ang sakit', 'sana mawala na ang sakit ng ulo ko', 'gusto ko lang mawala yung pagod'])(
    'leaves "%s" to the usual turn',
    (text) => expect(mentionsSelfHarm(text)).toBe(false),
  );
});
