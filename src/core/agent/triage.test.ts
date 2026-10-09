import { describe, expect, it } from 'vitest';
import { scopeAnswers, triage } from './triage';

const TODAY = '2026-10-10';
const t = (text: string, status?: 'pregnant' | 'postpartum' | 'neither') => triage(text, TODAY, status);

describe('triage: what she wants from this message', () => {
  it('sends anything with a danger word to the full safety check, whatever else it asks', () => {
    expect(t('sobrang sakit ng ulo ko tapos malabo paningin', 'neither')).toMatchObject({ purpose: 'urgent', typed: 'all' });
    expect(t('remove my period, and I am bleeding a lot', 'neither')).toMatchObject({ purpose: 'urgent', typed: 'all' });
  });

  it('reads edits to her data as updates that skip the danger questions', () => {
    expect(t('Can you remove my period logged this month?', 'neither')).toMatchObject({ purpose: 'update', typed: 'none' });
    expect(t('Remove the logged period from today', 'pregnant')).toMatchObject({ purpose: 'update', typed: 'none' });
    expect(t('i-undo mo', 'neither')).toMatchObject({ purpose: 'update', typed: 'none' });
  });

  it('reads logging a period as an update; bleeding counts only while pregnant or unknown', () => {
    expect(t('Niregla ako today', 'neither')).toMatchObject({ purpose: 'update', typed: 'no_bleeding' });
    expect(t('Niregla ako today', 'pregnant')).toMatchObject({ purpose: 'update', typed: 'all' });
    expect(t('Niregla ako today', undefined)).toMatchObject({ purpose: 'update', typed: 'all' });
  });

  it('keeps the danger questions when she logs symptoms', () => {
    expect(t('masakit puson ko, pagod na pagod ako', 'neither')).toMatchObject({ purpose: 'update', typed: 'all' });
  });

  it('reads questions about herself as asks that skip the danger questions', () => {
    for (const q of ['kailan next period ko?', 'fertile ba ako ngayon?', 'ilang weeks na ako?', 'how has my mood been this week?', 'ano nilog ko kahapon?', 'what is my average cycle length?', 'when do I ovulate?']) {
      expect(t(q, 'neither')).toMatchObject({ purpose: 'ask', typed: 'none' });
    }
  });

  it('reads greetings and thanks as chat', () => {
    expect(t('Hi', 'neither')).toMatchObject({ purpose: 'chat', typed: 'none' });
    expect(t('Thank you!', 'neither')).toMatchObject({ purpose: 'chat', typed: 'none' });
  });

  it('keeps the full safety check for health questions and anything it cannot read', () => {
    expect(t('pwede ba akong mag-kape?', 'pregnant')).toMatchObject({ purpose: 'health', typed: 'all' });
    expect(t('basta ganun', 'neither')).toMatchObject({ purpose: 'unclear', typed: 'all' });
  });

  it('applies the scope to the danger answers', () => {
    const answers = { 'yesno.vaginal_bleeding': [0.9, 0.1], 'severe.vaginal_bleeding': [0.2, 0.8], 'yesno.fever': [0.1, 0.9] };
    expect(scopeAnswers(answers, 'all')).toEqual(answers);
    expect(scopeAnswers(answers, 'none')).toBeUndefined();
    expect(scopeAnswers(answers, 'no_bleeding')).toEqual({ 'yesno.fever': [0.1, 0.9] });
    expect(scopeAnswers(undefined, 'all')).toBeUndefined();
  });
});
