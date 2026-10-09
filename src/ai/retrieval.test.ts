import { describe, expect, it } from 'vitest';
import { cosine, docPrompt, pickCard, queryPrompt, stageFor } from './retrieval';

const index = [
  { id: 'preg-a', stage: 'pregnancy' as const, vector: [1, 0, 0] },
  { id: 'preg-b', stage: 'pregnancy' as const, vector: [0.6, 0.8, 0] },
  { id: 'post-a', stage: 'postpartum' as const, vector: [0.99, 0.14, 0] },
];

describe('retrieval', () => {
  it('uses EmbeddingGemma prompt formats for questions and cards', () => {
    expect(queryPrompt('masakit balakang ko')).toBe('task: search result | query: masakit balakang ko');
    expect(docPrompt('WHO, PCPNC, M2', 'Go to the health centre')).toBe('title: WHO, PCPNC, M2 | text: Go to the health centre');
  });

  it('measures similarity as the cosine of two vectors', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([3, 4], [6, 8])).toBeCloseTo(1);
  });

  it('picks the closest card for her stage above the threshold', () => {
    expect(pickCard([0.7, 0.7, 0], index, { stage: 'pregnancy', tau: 0.5 })?.id).toBe('preg-b');
  });

  it('never shows a card from the other stage', () => {
    expect(pickCard([1, 0, 0], index, { stage: 'postpartum', tau: 0.5 })?.id).toBe('post-a');
    expect(pickCard([1, 0, 0], index, { stage: 'pregnancy', tau: 0.5 })?.id).toBe('preg-a');
  });

  it('shows no card rather than a weak match', () => {
    expect(pickCard([0, 0, 1], index, { stage: 'pregnancy', tau: 0.5 })).toBeNull();
  });

  it('maps her status to the cards she should see', () => {
    expect(stageFor({ status: 'pregnant' })).toBe('pregnancy');
    expect(stageFor({ status: 'postpartum' })).toBe('postpartum');
    expect(stageFor({ status: 'neither' })).toBeNull();
  });
});
