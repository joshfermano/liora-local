import type { Finding } from '../types';

// Signs that should not wait for anyone, pregnant or not: losing sight, fits, fainting, blue lips, or a
// severe headache, belly pain or breathing trouble in her own words. The WHO pregnancy rules do not
// cover her when she is not pregnant, so these get a plain "do not wait" and her contact instead.
const ANY_TIME: readonly string[] = ['visual_disturbance', 'convulsions', 'unconscious', 'central_cyanosis'];
const WHEN_SEVERE: readonly string[] = ['severe_headache', 'severe_abdominal_pain', 'severe_difficulty_breathing'];

export function seriousForAnyone(findings: readonly Finding[]): boolean {
  return findings.some((f) => ANY_TIME.includes(f.code) || (WHEN_SEVERE.includes(f.code) && f.severity === 'severe'));
}
