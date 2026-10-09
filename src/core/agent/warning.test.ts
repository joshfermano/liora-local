import { describe, expect, it } from 'vitest';
import { warningSignsCard } from './warning';

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
  ])('shows the DOH warning-signs card for "%s"', (text) => expect(warningSignsCard(text)).toBe(CARD));

  it.each(['masakit ulo ko', 'pagod ako', 'may puting discharge ako', 'gumagalaw si baby', 'Nagsimula regla ko ngayon'])('leaves "%s" alone', (text) =>
    expect(warningSignsCard(text)).toBeNull(),
  );
});
