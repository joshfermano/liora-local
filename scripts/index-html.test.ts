import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('public/index.html', 'utf8');

describe('public/index.html', () => {
  // NativeWind throws in development if this flag only arrives with the late-injected stylesheet.
  it('declares the NativeWind dark-mode flag before any script runs', () => {
    const head = html.slice(0, html.indexOf('<script'));
    expect(head).toMatch(/--css-interop-darkMode:\s*media/);
  });

  it('lets the page reach the screen edges on iPhone', () => {
    expect(html).toMatch(/viewport-fit=cover/);
  });
});
