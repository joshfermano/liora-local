import { DANGER_CODES } from '../vocabulary';
import type { Context, SourceRef } from '../types';
import type { Rule } from './rule';

const WHO_ANC_DAK = {
  org: 'WHO',
  title: 'WHO antenatal care recommendations for a positive pregnancy experience: digital adaptation kit',
  year: 2021,
  url: 'https://www.who.int/publications/i/item/9789240020306',
};

export const DT01_SOURCE: SourceRef = { ...WHO_ANC_DAK, ref: 'ANC.DT.01' };

const WHO_PCPNC = {
  org: 'WHO',
  title: 'Pregnancy, childbirth, postpartum and newborn care: a guide for essential practice, 3rd edition',
  year: 2015,
  url: 'https://www.who.int/publications/i/item/9789241549356',
};
export const PCPNC_M2_SOURCE: SourceRef = { ...WHO_PCPNC, ref: 'M2, p. 163' };

const inPregnancy = (ctx: Context) => ctx.status !== 'postpartum';
const afterBirth = (ctx: Context) => ctx.status === 'postpartum';
// The woman-facing PCPNC list splits these by what she reports; the DAK's health-worker list does not,
// so after birth (no PCPNC M2 split) they keep the DAK's go-now rule.
const SPLIT_IN_PREGNANCY: readonly string[] = ['fever', 'looks_very_ill'];
export const DT17_SOURCE: SourceRef = { ...WHO_ANC_DAK, ref: 'ANC.DT.17' };

export const DT01_RULES: Rule[] = DANGER_CODES.map((code) => ({
  id: `ANC.DT.01.${code}`,
  codes: [code],
  ...(code.startsWith('severe_') ? { minSeverity: 'severe' as const } : {}),
  ...(SPLIT_IN_PREGNANCY.includes(code) ? { when: afterBirth } : {}),
  level: 'go_now' as const,
  source: DT01_SOURCE,
}));

// WHO PCPNC M2, p. 163: "immediately, day or night" for fever and too weak to get out of bed; "as soon
// as possible" for fever, abdominal pain and feeling ill.
export const PCPNC_RULES: Rule[] = [
  { id: 'PCPNC.M2.fever_weak', codes: ['fever'], minSeverity: 'severe', when: inPregnancy, level: 'go_now', source: PCPNC_M2_SOURCE, card: 'pcpnc-m2-danger-immediately' },
  { id: 'PCPNC.M2.fever', codes: ['fever'], when: inPregnancy, level: 'go_soon', source: PCPNC_M2_SOURCE, card: 'pcpnc-m2-danger-soon' },
  { id: 'PCPNC.M2.abdominal_pain', codes: ['severe_abdominal_pain'], when: inPregnancy, level: 'go_soon', source: PCPNC_M2_SOURCE, card: 'pcpnc-m2-danger-soon' },
  { id: 'PCPNC.M2.feel_ill', codes: ['looks_very_ill'], when: inPregnancy, level: 'go_soon', source: PCPNC_M2_SOURCE, card: 'pcpnc-m2-danger-soon' },
];

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
