// Builds candidate source cards by copying exact spans from the documents' text, so no passage is typed by hand.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('sources/manifest.json', 'utf8')).sources;
const specs = JSON.parse(readFileSync('sources/candidates.spec.json', 'utf8'));
const BULLETS = /[\u0084\u0086]|→→/g;

function pageText(source, page) {
  const out = `sources/text/reading/${source}-p${String(page).padStart(3, '0')}.txt`;
  if (!existsSync(out)) {
    mkdirSync('sources/text/reading', { recursive: true });
    execFileSync('pdftotext', ['-f', String(page), '-l', String(page), `sources/raw/${source}.pdf`, out]);
  }
  return readFileSync(out, 'utf8').replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n');
}

const flat = (t) => t.replace(BULLETS, ' ').replace(/\s+/g, ' ').trim();
const failures = [];
const candidates = specs.map((spec) => {
  const text = pageText(spec.source, spec.page);
  const searchable = text.replace(/\n/g, ' ');
  const a = searchable.indexOf(spec.start);
  const b = a < 0 ? -1 : searchable.indexOf(spec.end, a);
  if (a < 0 || b < 0) {
    failures.push(`${spec.id}: ${a < 0 ? 'start' : 'end'} phrase not found on page ${spec.page}`);
    return { ...spec, body: null };
  }
  const span = text.slice(a, b + spec.end.length);
  const body = span
    .replace(BULLETS, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
  if (!flat(searchable).includes(flat(body))) failures.push(`${spec.id}: verbatim check failed`);
  const src = manifest.find((m) => m.id === spec.source);
  return { ...spec, body, citation: { org: src.org, title: src.title, year: src.year, page: spec.page, url: src.page } };
});

writeFileSync('sources/candidates.json', JSON.stringify(candidates, null, 2) + '\n');
console.log(`${candidates.length} candidates, ${failures.length} failures`);
for (const f of failures) console.log(`FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
