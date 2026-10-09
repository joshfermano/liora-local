import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// The layer table in ARCHITECTURE.md, enforced: each layer may import only the layers listed.
type Layer = 'core' | 'content' | 'ai' | 'store' | 'ui' | 'eval';
const ALLOWED: Record<Layer, readonly Layer[]> = {
  core: ['core'],
  content: ['content', 'core'],
  ai: ['ai', 'core', 'content'],
  store: ['store', 'core', 'content'],
  ui: ['ui', 'store', 'ai', 'content', 'core'],
  eval: ['eval', 'core', 'content'],
};
const CORE_PACKAGES = /^(?:zod|date-fns)(?:\/|$)/;

// Known exceptions, each to be removed by the move named beside it; this list may only shrink.
const EXCEPTIONS = new Set([
  'src/core/pipeline.ts -> src/ai/typed-decisions', // move toFindings into src/core
  'src/ai/gemma-boot.ts -> src/store/agent', // gemma-boot is startup wiring: move it under app/
  'src/ai/gemma-boot.ts -> src/store/tell',
  'src/store/profile.ts -> src/ui/art/marks', // move the avatar mark list into src/content
  'src/store/profile.ts -> src/ui/name', // move cleanName and mergeSetup into src/store
]);

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const layerOf = (file: string): Layer | null => {
  const m = /^src\/(core|content|ai|store|ui|eval)\//.exec(file);
  return m ? (m[1] as Layer) : null;
};

function imports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/(?:^|\n)\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'/g)].map((m) => m[1]!);
}

describe('layers depend inward only (ARCHITECTURE.md)', () => {
  for (const file of sources('src')) {
    const from = layerOf(file);
    if (!from) continue;
    it(`${file} imports only what its layer may`, () => {
      const wrong: string[] = [];
      for (const spec of imports(file)) {
        if (spec.startsWith('.')) {
          const target = relative('.', normalize(join(dirname(file), spec))).replace(/\\/g, '/');
          const to = layerOf(`${target}/`) ?? layerOf(target);
          if (to && !ALLOWED[from].includes(to) && !EXCEPTIONS.has(`${file} -> ${target}`)) wrong.push(target);
        } else if (from === 'core' && !CORE_PACKAGES.test(spec)) {
          wrong.push(spec);
        }
      }
      expect(wrong).toEqual([]);
    });
  }

  it('every listed exception still exists, so the list only shrinks', () => {
    const seen = new Set<string>();
    for (const file of sources('src')) {
      for (const spec of imports(file)) {
        if (!spec.startsWith('.')) continue;
        seen.add(`${file} -> ${relative('.', normalize(join(dirname(file), spec))).replace(/\\/g, '/')}`);
      }
    }
    expect([...EXCEPTIONS].filter((e) => !seen.has(e))).toEqual([]);
  });
});
