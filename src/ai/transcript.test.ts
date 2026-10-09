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
});
