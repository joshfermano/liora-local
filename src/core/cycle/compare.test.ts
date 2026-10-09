import { describe, expect, it } from 'vitest';

// Simulated histories only, to choose a method; these numbers are never shown in the app or pitch.
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());

type Cohort = { name: string; base: [number, number]; sd: number; drift: number; missed: number };
const COHORTS: Cohort[] = [
  { name: 'steady', base: [28, 2], sd: 1.5, drift: 0, missed: 0 },
  { name: 'variable', base: [30, 3], sd: 5, drift: 0, missed: 0 },
  { name: 'missed logs (15%)', base: [28, 2], sd: 1.5, drift: 0, missed: 0.15 },
  { name: 'slow drift', base: [30, 2], sd: 1.5, drift: -0.35, missed: 0 },
];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
function weightedMedian(newestFirst: number[], decay: number): number {
  const items = newestFirst.map((v, i) => ({ v, w: decay ** i })).sort((a, b) => a.v - b.v);
  const half = items.reduce((a, b) => a + b.w, 0) / 2;
  let acc = 0;
  for (const it of items) {
    acc += it.w;
    if (acc >= half) return it.v;
  }
  return items.at(-1)!.v;
}
// A cycle near a whole multiple of her usual length, when the rest are steady, is a forgotten period.
function dropGaps(newestFirst: number[]): number[] {
  if (newestFirst.length < 4) return newestFirst;
  return newestFirst.filter((c, i) => {
    const others = newestFirst.filter((_, j) => j !== i);
    const m = median(others);
    const mad = median(others.map((x) => Math.abs(x - m)));
    const ratio = c / m;
    return !(ratio >= 1.6 && Math.abs(ratio - Math.round(ratio)) <= 0.2 && (1.4826 * mad) / m <= 0.15);
  });
}

const METHODS: Record<string, (newestFirst: number[]) => number> = {
  'A mean of last 6': (c) => Math.round(mean(c.slice(0, 6))),
  'B recency-weighted median': (c) => weightedMedian(c.slice(0, 12), 0.85),
  'C weighted median + missed-log check': (c) => weightedMedian(dropGaps(c).slice(0, 12), 0.85),
};

function simulate(c: Cohort, women: number, seed: number) {
  const r = rng(seed);
  const results: Record<string, { err: number[]; hit: number }> = {};
  for (const m of Object.keys(METHODS)) results[m] = { err: [], hit: 0 };
  for (let w = 0; w < women; w++) {
    const base = c.base[0] + c.base[1] * normal(r);
    const truth: number[] = [];
    let day = 0;
    for (let k = 0; k < 16; k++) {
      truth.push(day);
      day += Math.max(18, Math.min(50, Math.round(base + c.drift * k + c.sd * normal(r))));
    }
    const logged = truth.filter((_, k) => k === 0 || r() >= c.missed);
    for (let k = 4; k < logged.length - 1; k++) {
      const starts = logged.slice(0, k + 1);
      const cycles = starts.slice(1).map((s, i) => s - starts[i]!).filter((g) => g >= 15 && g <= 90).reverse();
      if (cycles.length < 3) continue;
      const nextTrue = truth.find((t) => t > starts.at(-1)!)!;
      const spread = Math.max(...cycles.slice(0, 6)) - Math.min(...cycles.slice(0, 6));
      const half = Math.max(2, Math.ceil(spread / 2));
      for (const [name, f] of Object.entries(METHODS)) {
        const guess = starts.at(-1)! + f(cycles);
        const e = Math.abs(guess - nextTrue);
        results[name]!.err.push(e);
        if (e <= half) results[name]!.hit++;
      }
    }
  }
  return results;
}

describe('choosing the next-period method on simulated histories', () => {
  it('compares error and window hits', () => {
    const rows: string[] = [];
    const table: Record<string, Record<string, number>> = {};
    for (const [i, c] of COHORTS.entries()) {
      const res = simulate(c, 800, 1000 + i);
      for (const [m, { err, hit }] of Object.entries(res)) {
        const mae = mean(err);
        (table[c.name] ??= {})[m] = mae;
        rows.push(`${c.name.padEnd(18)} ${m.padEnd(38)} error ${mae.toFixed(2)} d   window held ${((100 * hit) / err.length).toFixed(0)}%`);
      }
    }
    console.log('\n' + rows.join('\n'));
    for (const c of COHORTS) {
      expect(table[c.name]!['C weighted median + missed-log check']!).toBeLessThanOrEqual(table[c.name]!['A mean of last 6']! + 0.15);
    }
  });
});
