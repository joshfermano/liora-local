import { describe, expect, it } from 'vitest';
import { goodNews } from './news';

describe('good news she shares', () => {
  it.each(['sumipa si baby kanina!', 'baby kicked a lot today', 'okay daw si baby', 'narinig ko heartbeat ni baby'])('hears "%s"', (text) => {
    expect(goodNews(text)).toBe(true);
  });

  it.each(['hindi sumisipa si baby', 'baby has not moved today', 'less kicks today', 'masakit ulo ko'])('does not hear "%s"', (text) => {
    expect(goodNews(text)).toBe(false);
  });
});
