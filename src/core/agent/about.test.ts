import { describe, expect, it } from 'vitest';
import { aboutLiora } from './about';

describe('aboutLiora', () => {
  it.each(['Who are you?', 'sino ka?', 'Ano ka ba?', 'what is your name', 'Ano pangalan mo?', 'are you a bot?', 'Are you ChatGPT?', 'tao ka ba?'])(
    'knows "%s" asks who she is talking to',
    (text) => expect(aboutLiora(text)).toBe('identity'),
  );

  it.each(['search google for prenatal vitamins', 'i-search mo nga', 'what is the weather today', 'anong balita ngayon?', 'look it up online', 'can you browse the internet?', 'check the news'])(
    'knows "%s" needs the internet',
    (text) => expect(aboutLiora(text)).toBe('offline'),
  );

  it.each(['can you call the hospital for me?', 'call an ambulance for me', 'tawagan mo ang ospital'])('knows "%s" asks Liora to place a call', (text) =>
    expect(aboutLiora(text)).toBe('call'),
  );

  it.each(['book me an appointment', 'pa-schedule ng check-up', 'order food for me', 'remind me to take a walk', 'set an alarm', 'send an email to my OB', 'play some music', 'pay my bill'])(
    'knows "%s" is something Liora cannot do',
    (text) => expect(aboutLiora(text)).toBe('cannot'),
  );

  it.each(['Bukas ang schedule ng check-up ko', 'Nag-online class ako kanina', 'masakit ulo ko', 'Nagsimula regla ko ngayon', 'kailan next period ko?', 'i-text mo si mama', 'tawagan mo asawa ko', 'may puting discharge ako', 'thank you', 'normal ba ang discharge?'])(
    'leaves "%s" to the usual turn',
    (text) => expect(aboutLiora(text)).toBeNull(),
  );

  it.each(['bakit ka nandito?', 'para saan ka?', 'who made you?', 'sino gumawa sa iyo?', 'what can you do?', 'Ano ang kaya mong gawin?', 'ano kaya mo'])('answers "%s" with who Liora is', (text) => {
    expect(aboutLiora(text)).toBe('identity');
  });

  it.each([
    'What is the capital of France?',
    'Write me a poem about the sea',
    'solve 12 x 7',
    'tell me a joke',
    'who won the NBA finals?',
    'help me with my math homework',
    'how do I cook adobo?',
    'translate this to Spanish',
    'write python code for a calculator',
    'who is the president of the Philippines?',
    'explain how airplanes fly',
    'gawan mo ako ng tula',
  ])('refuses the unrelated "%s"', (text) => {
    expect(aboutLiora(text)).toBe('offtopic');
  });

  it.each([
    'masakit ulo ko',
    'pagod ako',
    'Ang lungkot ko ngayon',
    'kailan next period ko?',
    'how does the calendar work?',
    'normal ba ang discharge?',
    'pwede ba ako mag-kape?',
    'ano ang dapat kainin ng buntis?',
    'what should I eat during pregnancy?',
    'how many weeks am I?',
    'hello',
    'salamat',
    'okay',
    'Nag-exercise ako kanina',
    'can I take a bath after giving birth?',
    'How does Liora decide?',
    'how are you?',
    'kumusta ka?',
    "what's up?",
    'okay ka lang?',
    'good morning!',
    '???',
    '...',
    'ano ang dapat kong gawin?',
    'what should I do?',
    'help me',
  ])('does not refuse "%s"', (text) => {
    expect(aboutLiora(text)).not.toBe('offtopic');
  });

  it.each([
    ['tagalog ka ba?', 'language'],
    ['can you speak tagalog', 'language'],
    ['marunong ka ba mag-tagalog?', 'language'],
    ["what's my name?", 'name'],
    ['ano pangalan ko?', 'name'],
    ['i love you liora', 'love'],
    ['mahal kita', 'love'],
    ["you're useless", 'sorry'],
    ['walang kwenta ka', 'sorry'],
    ['kumusta ka?', 'howareyou'],
    ['how are you', 'howareyou'],
  ])('reads "%s" as %s', (text, kind) => {
    expect(aboutLiora(text)).toBe(kind);
  });
});
