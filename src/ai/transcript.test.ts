import { describe, expect, it } from 'vitest';
import { transcriptOnly } from './transcript';

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
