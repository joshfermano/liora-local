import { describe, expect, it } from 'vitest';
import { heardWords, MIN_CLIP_MS, transcriptOnly } from './transcript';

describe('transcriptOnly', () => {
  it('keeps her words, trimmed', () => {
    expect(transcriptOnly('  Kumusta po  ')).toBe('Kumusta po');
  });

  it('drops a reply that opens a reasoning channel', () => {
    expect(transcriptOnly('<|channel>thought\nThinking Process:\n\n1. Analyze the Request')).toBe('');
  });

  it('drops reasoning even without the channel marker', () => {
    expect(transcriptOnly('Thinking Process: the user wants a transcript')).toBe('');
  });

  it('drops the model talking about the task instead of her words', () => {
    expect(transcriptOnly('Please provide the recording you are referring to. I need the audio file to transcribe it for you.')).toBe('');
    expect(transcriptOnly("I cannot transcribe this; there is no audio.")).toBe('');
    expect(transcriptOnly("I'm sorry, I can't hear anything in this recording.")).toBe('');
  });

  it('keeps her words even when she mentions a recording', () => {
    expect(transcriptOnly('Nag-record ako ng boses ko kahapon')).toBe('Nag-record ako ng boses ko kahapon');
  });
});

describe('heardWords', () => {
  it('keeps real speech', () => {
    expect(heardWords('Niregla ako today', 1800)).toBe('Niregla ako today');
    expect(heardWords('"Baba, gano sa mga kasiyahan mo."', 1900)).toBe('Baba, gano sa mga kasiyahan mo.');
  });

  it('drops clips too short to hold words', () => {
    expect(heardWords('Hello', MIN_CLIP_MS - 1)).toBeNull();
  });

  it('drops the model talking about the recording instead of writing it down', () => {
    expect(heardWords('Please provide the recording you are referring to. I need the audio file to transcribe it for you.', 2000)).toBeNull();
    expect(heardWords('I cannot hear any speech in this audio.', 2000)).toBeNull();
    expect(heardWords('   ', 2000)).toBeNull();
  });
});
