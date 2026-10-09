import { format, parseISO, subDays } from 'date-fns';
import type { DayLog, Entry, PeriodRecord } from '../types';
import { DANGER_CODES } from '../vocabulary';

// The handoff report she shows or sends to a nurse, BHW or doctor: who she is, what is happening
// now in her own words with the rule that fired, and what she logged this week. Data only; the
// screen and the PDF word it from fixed copy.
export interface HandoffInput {
  patient: {
    name?: string;
    age?: number;
    bloodType?: string;
    heightCm?: number;
    weightKg?: number;
    status?: 'pregnant' | 'postpartum' | 'neither';
    weeks?: number;
    daysSinceBirth?: number;
  };
  emergency?: { name: string; relation?: string; phone: string };
  entry: Entry | null;
  entries: Entry[];
  dayLogs: DayLog[];
  periods: PeriodRecord[];
  now: Date;
}

export interface HandoffReport {
  madeAt: string;
  patient: { name?: string; age?: number; bloodType?: string; heightCm?: number; weightKg?: number };
  pregnancy: {
    status: 'pregnant' | 'postpartum' | 'neither' | 'unknown';
    weeks?: number;
    daysSinceBirth?: number;
    lastPeriodStart?: string;
  };
  concern: {
    said: string;
    at: string;
    input: Entry['input'];
    level: Entry['decision']['level'];
    signs: { code: string; severity: string }[];
    rules: string[];
  } | null;
  recent: { date: string; flow: DayLog['flow']; symptoms: string[]; moods: string[] }[];
  emergency?: { name: string; relation?: string; phone: string };
}

const RECENT_DAYS = 7;
const SEVERITY_RANK: Record<string, number> = { severe: 0, moderate: 1, mild: 2, unknown: 3 };
const isDanger = (code: string) => (DANGER_CODES as readonly string[]).includes(code);
const dayOf = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd');
const dangerFirst = (a: string, b: string) => Number(isDanger(b)) - Number(isDanger(a)) || a.localeCompare(b);
const defined = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export function handoffReport({ patient, emergency, entry, entries, dayLogs, periods, now }: HandoffInput): HandoffReport {
  const today = format(now, 'yyyy-MM-dd');
  const since = format(subDays(now, RECENT_DAYS - 1), 'yyyy-MM-dd');
  const lastPeriodStart = periods.map((p) => p.start).filter((s) => s <= today).sort().at(-1);

  const status = patient.status ?? 'unknown';
  const pregnancy = defined({
    status,
    weeks: status === 'pregnant' ? patient.weeks : undefined,
    daysSinceBirth: status === 'postpartum' ? patient.daysSinceBirth : undefined,
    lastPeriodStart: status === 'postpartum' ? undefined : lastPeriodStart,
  });

  const concern = entry
    ? {
        said: entry.text,
        at: entry.created_at,
        input: entry.input,
        level: entry.decision.level,
        signs: [...entry.findings]
          .sort(
            (a, b) =>
              Number(isDanger(b.code)) - Number(isDanger(a.code)) ||
              (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3) ||
              a.code.localeCompare(b.code),
          )
          .map((f) => ({ code: f.code, severity: f.severity })),
        rules: entry.decision.fired.map((f) => f.rule_id),
      }
    : null;

  const days = new Map<string, { flow: DayLog['flow']; symptoms: Set<string>; moods: Set<string> }>();
  const at = (date: string) => {
    if (!days.has(date)) days.set(date, { flow: null, symptoms: new Set(), moods: new Set() });
    return days.get(date)!;
  };
  for (const l of dayLogs) {
    if (l.date < since || l.date > today) continue;
    const d = at(l.date);
    d.flow = l.flow ?? d.flow;
    l.symptoms.forEach((s) => d.symptoms.add(s));
    l.moods.forEach((m) => d.moods.add(m));
  }
  for (const e of entries) {
    const date = dayOf(e.created_at);
    if (date < since || date > today) continue;
    const d = at(date);
    e.findings.forEach((f) => d.symptoms.add(f.code));
    (e.extraction?.moods ?? []).forEach((m) => d.moods.add(m));
  }
  const recent = [...days]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, d]) => ({ date, flow: d.flow, symptoms: [...d.symptoms].sort(dangerFirst), moods: [...d.moods].sort() }));

  return defined({
    madeAt: now.toISOString(),
    patient: defined({
      name: patient.name,
      age: patient.age,
      bloodType: patient.bloodType,
      heightCm: patient.heightCm,
      weightKg: patient.weightKg,
    }),
    pregnancy,
    concern,
    recent,
    emergency,
  }) as HandoffReport;
}
