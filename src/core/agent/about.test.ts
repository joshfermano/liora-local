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

  it.each(['book me an appointment', 'pa-schedule ng check-up', 'order food for me', 'remind me to take a walk', 'set an alarm', 'send an email to my OB', 'play some music', 'pay my bill'])(
    'knows "%s" is something Liora cannot do',
    (text) => expect(aboutLiora(text)).toBe('cannot'),
  );

  it.each(['Bukas ang schedule ng check-up ko', 'Nag-online class ako kanina', 'masakit ulo ko', 'Nagsimula regla ko ngayon', 'kailan next period ko?', 'i-text mo si mama', 'tawagan mo asawa ko', 'may puting discharge ako', 'thank you', 'normal ba ang discharge?'])(
    'leaves "%s" to the usual turn',
    (text) => expect(aboutLiora(text)).toBeNull(),
  );
});
