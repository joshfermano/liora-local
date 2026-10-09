import type { Finding, Severity } from './types';

// Provisional; LUM-77 tunes these on the eval set.
export const PROVISIONAL_THRESHOLDS = { tauLo: 0.2, tauHi: 0.6 };

export interface Thresholds {
  tauLo: number;
  tauHi: number;
}

const RANK: Record<'mild' | 'moderate', number> = { mild: 0, moderate: 1 };

export function mergeSeverity(a: Severity, b: Severity): Severity {
  if (a === 'severe' || b === 'severe') return 'severe';
  if (a === 'unknown' || b === 'unknown') return 'unknown';
  return RANK[a] >= RANK[b] ? a : b;
}

export function mergeFindings(findings: Finding[]): Finding[] {
  const byCode = new Map<string, Finding>();
  for (const f of findings) {
    const prev = byCode.get(f.code);
    if (!prev) {
      byCode.set(f.code, { ...f, sources: [...new Set(f.sources)] });
      continue;
    }
    const confidences = [prev.confidence, f.confidence].filter((c): c is number => c !== null);
    byCode.set(f.code, {
      code: f.code,
      severity: mergeSeverity(prev.severity, f.severity),
      sources: [...new Set([...prev.sources, ...f.sources])],
      confidence: confidences.length ? Math.max(...confidences) : null,
    });
  }
  return [...byCode.values()];
}

export function fromTypedDecision(
  code: Finding['code'],
  probability: number,
  scoredSeverity: Severity | null,
  thresholds: Thresholds,
): Finding | null {
  if (probability < thresholds.tauLo) return null;
  const severity: Severity =
    probability >= thresholds.tauHi && scoredSeverity ? scoredSeverity : 'unknown';
  return { code, severity, sources: ['llm'], confidence: probability };
}
