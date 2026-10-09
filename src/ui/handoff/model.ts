import { format, parseISO, subDays } from 'date-fns';
import { COPY, en, signKey } from '../../content/copy';
import type { HandoffReport } from '../../core/handoff';
import { DANGER_CODES } from '../../core/vocabulary';
import { sourceFor } from '../ruleSource';
import { formatPhPhone } from '../../core/phone';

// One shape for the screen and the PDF, so the two can never say different things.
export type Level = 'go_now' | 'follow_up' | 'go_soon' | 'ok';

export interface Fact {
  label: string;
  value: string;
}

export interface SignChip {
  label: string;
  severity: string;
  origin: string;
  urgent: boolean;
}

export interface RuleItem {
  name: string;
  org: string;
  title: string;
  year: number;
  section: string;
}

export interface DayRow {
  date: string;
  flow?: string;
  symptoms: string[];
  moods: string[];
}

export interface ReportModel {
  title: string;
  subtitle: string;
  header: {
    initial: string;
    name?: string;
    blood?: Fact;
    facts: Fact[];
    status: string;
    made: string;
  };
  banner: { level: Level; tag: string; headline: string; line?: string } | null;
  concern: {
    title: string;
    said: Fact;
    quote: string;
    when: Fact;
    how: Fact;
    bp?: Fact;
    signsTitle: string;
    signs: SignChip[];
  } | null;
  rules: { title: string; items: RuleItem[]; citeSection: string } | null;
  recent: { title: string; days: DayRow[]; labels: { flow: string; symptoms: string; moods: string }; quiet?: string };
  emergency: { title: string; name: string; relation?: Fact; phone: Fact; dial: string; callLabel: string } | null;
  footer: string[];
}

export interface ReportExtras {
  bp?: { systolic: number; diastolic: number };
}

const isDanger = (code: string) => (DANGER_CODES as readonly string[]).includes(code);
const has = (key: string) => key in COPY;
const fill = (key: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), en(key));

const label = (code: string): string => {
  for (const key of [`symptom.${code}`, signKey(code)]) if (has(key)) return en(key);
  return code.replace(/_/g, ' ');
};
const unit = (value: number | undefined, unitKey: string) => (value === undefined ? undefined : `${value} ${en(unitKey)}`);
const fact = (labelKey: string, value: string | undefined): Fact[] => (value ? [{ label: en(labelKey), value }] : []);
const unique = (items: string[]) => [...new Set(items)];

const SEVERITY_ORDER = ['severe', 'moderate', 'mild', 'unknown'];
const severityWord = (level: string) =>
  en(level === 'severe' ? 'handoff.sev.severe' : level === 'unknown' ? 'handoff.sev.unknown' : 'handoff.sev.not_severe');
const WORDS = new Set(['lexicon', 'checklist']);
const originWords = (sources: string[]) =>
  unique([
    ...(sources.some((s) => WORDS.has(s)) ? [en('handoff.origin.words')] : []),
    ...(sources.some((s) => !WORDS.has(s)) ? [en('handoff.origin.model')] : []),
  ]).join(' + ');

function signChips(signs: NonNullable<HandoffReport['concern']>['signs']): SignChip[] {
  const byLabel = new Map<string, { severity: string; sources: string[]; urgent: boolean }>();
  for (const s of signs) {
    const key = label(s.code);
    const seen = byLabel.get(key);
    if (!seen) {
      byLabel.set(key, { severity: s.severity, sources: [...s.sources], urgent: isDanger(s.code) });
      continue;
    }
    if (SEVERITY_ORDER.indexOf(s.severity) < SEVERITY_ORDER.indexOf(seen.severity)) seen.severity = s.severity;
    seen.sources.push(...s.sources);
    seen.urgent ||= isDanger(s.code);
  }
  return [...byLabel].map(([name, v]) => ({
    label: name,
    severity: severityWord(v.severity),
    origin: originWords(v.sources),
    urgent: v.urgent,
  }));
}

function ruleItems(concern: NonNullable<HandoffReport['concern']>): RuleItem[] {
  const items: RuleItem[] = [];
  for (const id of concern.rules) {
    const source = sourceFor(id);
    if (!source) continue;
    const codes = concern.fired.find((f) => f.rule_id === id)?.codes ?? [];
    const name = has(`handoff.rule.${source.ref}`)
      ? en(`handoff.rule.${source.ref}`)
      : codes.length
        ? fill('handoff.rule.sign', { sign: unique(codes.map(label)).join(', ') })
        : id;
    items.push({ name, org: source.org, title: source.title, year: source.year, section: source.ref });
  }
  return items;
}

const BANNER: Record<Level, { headline: string; line?: string }> = {
  go_now: { headline: 'go.headline', line: 'go.line' },
  follow_up: { headline: 'companion.symptom.follow_up' },
  go_soon: { headline: 'soon.headline' },
  ok: { headline: 'companion.symptom.ok' },
};

function recentDays(report: HandoffReport) {
  const end = parseISO(report.madeAt);
  const dates = Array.from({ length: 7 }, (_, i) => format(subDays(end, i), 'yyyy-MM-dd'));
  const logged = new Map(report.recent.map((d) => [d.date, d]));
  const rows: DayRow[] = [];
  const empty: string[] = [];
  for (const date of dates) {
    const d = logged.get(date);
    const flow = d?.flow && has(`cal.flow.${d.flow}`) ? en(`cal.flow.${d.flow}`) : undefined;
    const symptoms = unique((d?.symptoms ?? []).map(label));
    const moods = unique((d?.moods ?? []).map((m) => (has(`feeling.${m}`) ? en(`feeling.${m}`) : m)));
    const day = format(parseISO(date), 'EEE d MMM');
    if (!flow && !symptoms.length && !moods.length) empty.push(day);
    else rows.push({ date: day, flow, symptoms, moods });
  }
  const quiet = !empty.length ? undefined : rows.length ? `${en('handoff.nothing_logged')}: ${empty.join(', ')}` : en('handoff.recent.none');
  return { rows, quiet };
}

export function reportModel(report: HandoffReport, extras: ReportExtras = {}): ReportModel {
  const { patient, pregnancy, concern, emergency } = report;

  const figure =
    pregnancy.status === 'pregnant' && pregnancy.weeks !== undefined
      ? fill('handoff.weeks', { n: pregnancy.weeks })
      : pregnancy.status === 'postpartum' && pregnancy.daysSinceBirth !== undefined
        ? fill('handoff.days_since_birth', { n: pregnancy.daysSinceBirth })
        : undefined;
  const lastPeriod = pregnancy.lastPeriodStart
    ? `${en('handoff.last_period')} ${format(parseISO(pregnancy.lastPeriodStart), 'd MMM yyyy')}`
    : undefined;
  const bloodType = patient.bloodType && patient.bloodType !== 'unknown' ? patient.bloodType : undefined;

  const { rows, quiet } = recentDays(report);
  const level = concern?.level as Level | undefined;
  const labels = { flow: en('handoff.flow'), symptoms: en('daylog.symptoms'), moods: en('daylog.moods') };

  return {
    title: en('handoff.title'),
    subtitle: en('handoff.subtitle'),
    header: {
      initial: (patient.name?.trim()[0] ?? 'L').toUpperCase(),
      name: patient.name,
      blood: bloodType ? { label: en('blood.title'), value: bloodType } : undefined,
      facts: [
        ...fact('profile.age', unit(patient.age, 'profile.unit.years')),
        ...fact('profile.height', unit(patient.heightCm, 'profile.unit.cm')),
        ...fact('profile.weight', unit(patient.weightKg, 'profile.unit.kg')),
      ],
      status: [en(`handoff.status.${pregnancy.status}`), figure, lastPeriod].filter(Boolean).join(' · '),
      made: fill('handoff.made', { date: format(parseISO(report.madeAt), 'd MMM yyyy, h:mm a') }),
    },
    banner: level
      ? {
          level,
          tag: en(`glance.level.${level}`),
          headline: en(BANNER[level].headline),
          line: BANNER[level].line ? en(BANNER[level].line!) : undefined,
        }
      : null,
    concern: concern
      ? {
          title: en('handoff.concern'),
          said: { label: en('handoff.said'), value: concern.said },
          quote: concern.said,
          when: { label: en('handoff.said_at'), value: format(parseISO(concern.at), 'h:mm a, d MMM yyyy') },
          how: { label: en('handoff.how'), value: en(`handoff.how.${concern.input}`) },
          bp: extras.bp ? { label: en('nurse.bp'), value: `${extras.bp.systolic}/${extras.bp.diastolic}` } : undefined,
          signsTitle: en('handoff.signs'),
          signs: signChips(concern.signs),
        }
      : null,
    rules: concern && concern.rules.length ? { title: en('handoff.rules'), items: ruleItems(concern), citeSection: en('handoff.cite.section') } : null,
    recent: { title: en('handoff.recent'), days: rows, labels: labels, quiet },
    emergency: emergency
      ? {
          title: en('handoff.emergency'),
          name: emergency.name,
          relation: emergency.relation ? { label: en('em.relation'), value: emergency.relation } : undefined,
          phone: { label: en('em.phone'), value: formatPhPhone(emergency.phone) ?? emergency.phone },
          dial: emergency.phone,
          callLabel: fill('handoff.call', { name: emergency.name }),
        }
      : null,
    footer: [en('handoff.private'), en('handoff.footer')],
  };
}
