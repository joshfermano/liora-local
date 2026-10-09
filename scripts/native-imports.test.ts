import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

function nativeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return nativeFiles(path);
    return /\.native\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// On iOS, Metro resolves './x' from x.native.ts back to x.native.ts itself, so a re-export from
// './x' becomes a getter that reads itself forever (it crashed the native model test screen).
describe('platform-specific files', () => {
  for (const file of nativeFiles('src')) {
    const own = basename(file).replace(/\.native\.tsx?$/, '');
    it(`${file} does not import its own module name`, () => {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(new RegExp(`from '\\./${own}'`));
    });
  }
});
