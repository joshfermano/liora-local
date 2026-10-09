import { DANGER_CODES } from '../vocabulary';
import type { SourceRef } from '../types';
import type { Rule } from './rule';

const WHO_ANC_DAK = {
  org: 'WHO',
  title: 'WHO antenatal care recommendations for a positive pregnancy experience: digital adaptation kit',
  year: 2021,
  url: 'https://www.who.int/publications/i/item/9789240020306',
};

export const DT01_SOURCE: SourceRef = { ...WHO_ANC_DAK, ref: 'ANC.DT.01' };
export const DT17_SOURCE: SourceRef = { ...WHO_ANC_DAK, ref: 'ANC.DT.17' };

export const DT01_RULES: Rule[] = DANGER_CODES.map((code) => ({
  id: `ANC.DT.01.${code}`,
  codes: [code],
  ...(code.startsWith('severe_') ? { minSeverity: 'severe' as const } : {}),
  level: 'go_now' as const,
  source: DT01_SOURCE,
}));

export const DT17_RULE: Rule = {
  id: 'ANC.DT.17',
  codes: [],
  when: (ctx) =>
    ctx.proteinuria === true &&
    ctx.bp !== undefined &&
    (ctx.bp.systolic >= 160 || ctx.bp.diastolic >= 110),
  level: 'go_now',
  source: DT17_SOURCE,
};
