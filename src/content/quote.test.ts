import { describe, expect, it } from 'vitest';
import { CARDS } from './cards';
import { readQuote } from './quote';

describe('readQuote', () => {
  it('joins the PDF line wraps and splits the lead from the list', () => {
    const q = readQuote(
      'If I experience any of the following warning signs, I should\nimmediately seek consultation at a health facility. Put a check (✔).\nSwelling of the legs, hands and/or face\nVaginal bleeding\nAbsence of/or reduced fetal movements\n(less than 10 kicks in 12 hours in the\nsecond half of pregnancy)',
    );
    expect(q.lead).toEqual(['If I experience any of the following warning signs, I should immediately seek consultation at a health facility. Put a check (✔).']);
    expect(q.items).toEqual([
      'Swelling of the legs, hands and/or face',
      'Vaginal bleeding',
      'Absence of/or reduced fetal movements (less than 10 kicks in 12 hours in the second half of pregnancy)',
    ]);
  });

  it('keeps a wrapped sentence as one paragraph', () => {
    expect(readQuote('I will not resort to self medication\nfor this can harm me and my baby')).toEqual({
      lead: ['I will not resort to self medication for this can harm me and my baby'],
      items: [],
    });
  });

  it('reads a run of short sentences as a list', () => {
    const q = readQuote('If waters break and not in labour after 6 hours.\nLabour pains (contractions) continue for more than 12 hours.\nHeavy bleeding (soaks more than 2-3 pads in 15 minutes).');
    expect(q.lead).toEqual([]);
    expect(q.items).toHaveLength(3);
  });

  it('never adds or drops a word on any card', () => {
    const words = (s: string) => s.split(/\s+/).filter(Boolean);
    for (const card of CARDS) {
      const q = readQuote(card.quote);
      expect(words([...q.lead, ...q.items].join(' '))).toEqual(words(card.quote));
    }
  });
  it('keeps lower-case items after a colon as separate items', () => {
    const q = readQuote('Go to the health centre as soon as possible if any of the following signs:\nfever\nabdominal pain\nfeel ill');
    expect(q.lead).toEqual(['Go to the health centre as soon as possible if any of the following signs:']);
    expect(q.items).toEqual(['fever', 'abdominal pain', 'feel ill']);
  });

  it('keeps a heading and a wrapped intro in the lead', () => {
    const q = readQuote('When to seek care on danger signs\nGo to the hospital immediately, DO NOT wait, if any of the\nfollowing signs:\nvaginal bleeding\nconvulsions/fits');
    expect(q.lead).toEqual(['When to seek care on danger signs', 'Go to the hospital immediately, DO NOT wait, if any of the following signs:']);
    expect(q.items).toEqual(['vaginal bleeding', 'convulsions/fits']);
  });

  it('puts a heading before a list without a colon in the lead', () => {
    const q = readQuote('Know the signs of labour\nPainful contractions every 20 minutes or less.\nBag of water breaks.\nBloody sticky discharge.');
    expect(q.lead).toEqual(['Know the signs of labour']);
    expect(q.items).toHaveLength(3);
  });
});

