import { describe, expect, it } from 'vitest';
import { messageLanguage } from './language';
import { replyPlan, type Outcome } from './outcome';
import { readActions } from './read';
import { triage } from './triage';

const today = '2026-10-10';

describe('Tagalog and Taglish chat', () => {
  it.each(['Kamusta?', 'Kamusta ka na?', 'Komusta po', 'uy Liora'])('%s is a greeting', (text) => {
    expect(readActions(text, today)).toEqual([{ tool: 'smalltalk' }]);
  });

  it.each(['Nag tatagalog kaba?', 'Ano pangalan mo?', 'Do you speak Tagalog?', 'Can we talk?'])(
    '%s is chat, not a health question',
    (text) => {
      expect(readActions(text, today)).toEqual([{ tool: 'smalltalk' }]);
      expect(triage(text, today, 'pregnant').purpose).toBe('chat');
    },
  );

  it.each(['Normal ba ang sakit ng puson?', 'Ano ang dapat kainin ng buntis?', 'What is a fertile window?', 'Safe ba mag-exercise?'])(
    '%s is still a health question',
    (text) => {
      expect(readActions(text, today).some((a) => a.tool === 'health_question')).toBe(true);
    },
  );

  it('answers chat as chat, with no checklist and no card', () => {
    const o: Outcome = {
      saved: [], waiting: false, undid: null, nothingToUndo: false, notFound: false, cycle: null, day: null,
      card: null, opened: null, smalltalk: 'chat', asksAboutHerData: false,
    };
    const { facts, fallback } = replyPlan(o, { tone: 'neutral', today });
    expect(facts.she_is_chatting).toBe(true);
    expect(facts.no_action_taken).toBeUndefined();
    expect(fallback.key).toBe('reply.chat');
  });
});

describe('messageLanguage', () => {
  it.each([
    ['Nag tatagalog kaba?', 'tagalog'],
    ['Kamusta?', 'tagalog'],
    ['Kamusta, I logged my period today', 'taglish'],
    ['How are you?', 'english'],
  ] as const)('%s → %s', (text, language) => {
    expect(messageLanguage(text, 'english')).toBe(language);
  });

  it('keeps the language she usually writes in when this message has no clear words', () => {
    expect(messageLanguage('ok', 'taglish')).toBe('taglish');
    expect(messageLanguage('😊', 'tagalog')).toBe('tagalog');
  });
});
