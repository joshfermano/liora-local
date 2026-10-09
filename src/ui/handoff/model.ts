import { format, parseISO } from 'date-fns';
import { COPY, en, severityKey, signKey } from '../../content/copy';
import type { HandoffReport } from '../../core/handoff';
import { DANGER_CODES } from '../../core/vocabulary';
import { sourceFor, sourceLine } from '../ruleSource';

// One shape for the screen and the PDF, so the two can never say different things.
export type Line =
  | { kind: 'row'; label: string; value: string; urgent?: boolean }
  | { kind: 'heading'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'item'; text: string; urgent?: boolean }
  | { kind: 'note'; text: string };

export interface ReportSection {
  title: string;
  lines: Line[];
}

export interface ReportModel {
  title: string;
  subtitle: string;
  made: string;
  sections: ReportSection[];
  footer: string;
}

export interface ReportExtras {
  bp?: { systolic: number; diastolic: number };
}

const isDanger = (code: string) => (DANGER_CODES as readonly string[]).includes(code);
const has = (key: string) => key in COPY;
const label = (code: string): string => {
  for (const key of [`symptom.${code}`, signKey(code)]) if (has(key)) return en(key);
  return code.replace(/_/g, ' ');
};

const row = (labelKey: string, value: string | number | undefined): Line[] =>
  value === undefined || value === '' ? [] : [{ kind: 'row', label: en(labelKey), value: String(value) }];
const unit = (value: number | undefined, unitKey: string) => (value === undefined ? undefined : `${value} ${en(unitKey)}`);

export function reportModel(report: HandoffReport, extras: ReportExtras = {}): ReportModel {
  const { patient, pregnancy, concern, recent, emergency } = report;
  const sections: ReportSection[] = [];

  const patientLines: Line[] = [
    ...row('profile.name', patient.name),
    ...row('profile.age', unit(patient.age, 'profile.unit.years')),
    ...row('blood.title', patient.bloodType === 'unknown' ? undefined : patient.bloodType),
    ...row('profile.height', unit(patient.heightCm, 'profile.unit.cm')),
    ...row('profile.weight', unit(patient.weightKg, 'profile.unit.kg')),
  ];
  if (patientLines.length) sections.push({ title: en('handoff.patient'), lines: patientLines });

  const figure =
    pregnancy.status === 'pregnant' && pregnancy.weeks !== undefined
      ? en('handoff.weeks').replace('{n}', String(pregnancy.weeks))
      : pregnancy.status === 'postpartum' && pregnancy.daysSinceBirth !== undefined
        ? en('handoff.days_since_birth').replace('{n}', String(pregnancy.daysSinceBirth))
        : undefined;
  sections.push({
    title: en('handoff.pregnancy'),
    lines: [
      { kind: 'item', text: [en(`handoff.status.${pregnancy.status}`), figure].filter(Boolean).join(' · ') },
      ...row('handoff.last_period', pregnancy.lastPeriodStart ? format(parseISO(pregnancy.lastPeriodStart), 'd MMM yyyy') : undefined),
    ],
  });

  if (concern) {
    const lines: Line[] = [
      { kind: 'row', label: en('nurse.logged'), value: format(parseISO(concern.at), 'h:mm a, d MMM yyyy') },
      { kind: 'heading', text: en('handoff.said') },
      { kind: 'quote', text: concern.said },
    ];
    if (concern.signs.length) {
      lines.push({ kind: 'heading', text: en('handoff.signs') });
      for (const s of concern.signs) {
        lines.push({ kind: 'item', text: `${label(s.code)} · ${en(severityKey(s.severity))}`, urgent: isDanger(s.code) });
      }
    }
    if (extras.bp) lines.push(...row('nurse.bp', `${extras.bp.systolic}/${extras.bp.diastolic}`));
    if (concern.rules.length) {
      lines.push({ kind: 'heading', text: en('handoff.rule') });
      for (const id of concern.rules) {
        lines.push({ kind: 'item', text: id });
        const source = sourceFor(id);
        if (source) lines.push({ kind: 'note', text: sourceLine(source) });
      }
    }
    sections.push({ title: en('handoff.concern'), lines });
  }

  const recentLines: Line[] = recent.length
    ? recent.map((d) => ({
        kind: 'row',
        label: format(parseISO(d.date), 'EEE d MMM'),
        value: [
          d.flow && has(`cal.flow.${d.flow}`) ? en('td.today.flow').replace('{flow}', en(`cal.flow.${d.flow}`)) : '',
          ...d.symptoms.map(label),
          ...d.moods.map((m) => (has(`feeling.${m}`) ? en(`feeling.${m}`) : m)),
        ]
          .filter(Boolean)
          .join(', '),
      }))
    : [{ kind: 'note', text: en('handoff.recent.none') }];
  sections.push({ title: en('handoff.recent'), lines: recentLines });

  if (emergency) {
    sections.push({
      title: en('handoff.emergency'),
      lines: [...row('em.name', emergency.name), ...row('em.relation', emergency.relation), ...row('em.phone', emergency.phone)],
    });
  }

  return {
    title: en('handoff.title'),
    subtitle: en('handoff.subtitle'),
    made: en('handoff.made').replace('{date}', format(parseISO(report.madeAt), 'd MMM yyyy, h:mm a')),
    sections,
    footer: en('handoff.footer'),
  };
}
