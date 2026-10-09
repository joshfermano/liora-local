import { describe, expect, it } from 'vitest';
import { afterBirthCard, warningSignsCard } from './warning';

const CARD = 'mcb-p4-warning-signs';

describe('warningSignsCard', () => {
  it.each([
    'hindi gumagalaw si baby',
    'hindi na sumisipa ang baby ko',
    'bihira na gumalaw ang baby',
    'my baby is not moving',
    'fewer kicks today',
    'manas ang paa ko',
    'namamaga ang mukha ko',
    'swollen feet and hands',
    'nahihilo ako',
    'I feel dizzy',
    'maputla ako',
    'masakit umihi',
    'it burns when I pee',
    'giniginaw ako',
    'watery discharge',
    'may lumalabas na tubig',
    'may tumutulong tubig sa akin',
    'leaking fluid',
    'masakit pag umiihi ako',
    'baby hasnt moved since morning',
    "the baby hasn't kicked today",
  ])('shows the DOH warning-signs card for "%s"', (text) => expect(warningSignsCard(text)).toBe(CARD));

  it.each(['masakit ulo ko', 'pagod ako', 'may puting discharge ako', 'gumagalaw si baby', 'Nagsimula regla ko ngayon'])('leaves "%s" alone', (text) =>
    expect(warningSignsCard(text)).toBeNull(),
  );
});

describe('signs after birth on the WHO go-soon list', () => {
  it.each(['masakit ang tahi ko', 'namamaga at may nana ang sugat ng cs ko', 'my stitches hurt', 'my c-section wound is red', 'hirap akong umihi', 'mabahong discharge', 'namamaga at pula ang dede ko'])('shows the card for "%s"', (text) => {
    expect(afterBirthCard(text)).toBe('pcpnc-m4-danger-soon');
  });

  it.each(['pagod ako', 'masakit ulo ko', 'nagpapadede ako', 'may sugat ako sa daliri, masakit', 'my knee wound hurts'])('leaves "%s" alone', (text) => {
    expect(afterBirthCard(text)).toBeNull();
  });
});
