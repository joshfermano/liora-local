import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Entry } from '../core/types';
import { bestCard, cardForRule, CARDS } from './cards';

type Candidate = { id: string; body: string; codes: string[]; check?: { verdict?: string } };
const candidates: Candidate[] = JSON.parse(readFileSync('sources/candidates.json', 'utf8'));
const approved = candidates.filter((c) => c.check?.verdict === 'approve');

const entry = (codes: string[], level: Entry['decision']['level'] = 'ok'): Entry => ({
  id: 'e1',
  created_at: '2026-10-09T00:00:00.000Z',
  text: 'x',
  input: 'text',
  findings: codes.map((code) => ({ code: code as never, severity: 'moderate', sources: ['llm'], confidence: 0.9 })),
  extraction: null,
  decision: { level, fired: [] },
  card_ids: [],
  models: [],
});

describe('source cards', () => {
  it('ships only the cards the review approved', () => {
    expect(CARDS.map((c) => c.id).sort()).toEqual(approved.map((c) => c.id).sort());
  });

  it('shows every card word for word as reviewed (SR-6)', () => {
    for (const card of CARDS) expect(card.quote).toBe(candidates.find((c) => c.id === card.id)?.body);
  });

  it('never links a sign the review asked to confirm', () => {
    const mcb = CARDS.find((c) => c.id === 'mcb-p4-warning-signs');
    expect(mcb?.codes).not.toContain('severe_vomiting');
  });

  it('opens the card linked to the sign that fired', () => {
    const card = cardForRule('ANC.DT.01.vaginal_bleeding');
    expect(card?.codes).toContain('vaginal_bleeding');
  });

  it('finds no card for a rule no reviewed card mentions', () => {
    expect(cardForRule('ANC.DT.17')).toBeNull();
  });

  it('picks a card for the signs in a calm answer', () => {
    expect(bestCard(entry(['severe_abdominal_pain']))?.codes).toContain('severe_abdominal_pain');
  });

  it('says nothing rather than guess when no card matches', () => {
    expect(bestCard(entry([]))).toBeNull();
  });
});
