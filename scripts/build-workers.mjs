import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

await build({
  entryPoints: ['workers/ai-worker.ts', 'workers/ml-worker.ts'],
  outdir: 'public/workers',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['safari18', 'chrome120'],
  minify: true,
  logLevel: 'info',
});

mkdirSync('public/ort', { recursive: true });
for (const ext of ['mjs', 'wasm']) {
  const file = `ort-wasm-simd-threaded.asyncify.${ext}`;
  copyFileSync(`node_modules/onnxruntime-web/dist/${file}`, `public/ort/${file}`);
}
