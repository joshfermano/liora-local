import { format, parseISO, subDays } from 'date-fns';
import type { Insight } from '../insights';
import { today as todayModel } from '../today';
import type { Entry, MoodResult } from '../types';
import type { AgentData, Facts } from './types';

// Everything Liora knows about her, written plainly for the reply prompt. Code computes every date
// and number here; Gemma may only quote them.
export interface ContextInput {
  data: AgentData;
  entries: Entry[];
  moodChecks: MoodResult[];
  profile: { name?: string; age?: number; status?: 'pregnant' | 'postpartum' | 'neither'; weeks?: number };
  today: string;
}

export interface ContextPack {
  text: string;
  facts: Facts;
}

const RECENT_DAYS = 7;
const CHECK_INS = 3;

const day = (iso: string) => format(parseISO(iso), 'MMM d');
const words = (codes: readonly string[]) => codes.map((c) => c.replace(/_/g, ' ')).join(', ');
const LEVEL: Record<Entry['decision']['level'], string> = {
  go_now: 'the rules said go to the hospital now',
  follow_up: 'the rules asked a follow-up question',
  ok: 'calm',
};

function pattern(i: Insight): string | null {
  switch (i.kind) {
    case 'recurring':
      return `${i.code.replace(/_/g, ' ')} mentioned ${i.count} times in the last ${i.withinDays} days`;
    case 'mood_pattern':
      return `felt ${i.mood} ${i.count} times in the last ${i.withinDays} days`;
    case 'cycle_spread':
      return `cycles ranged from ${i.min} to ${i.max} days`;
    case 'last_cycle':
      return `last cycle was ${i.days} days against an average of ${i.average}`;
    default:
      return null;
  }
}

export function contextPack({ data, entries, moodChecks, profile, today }: ContextInput): ContextPack {
  const status = profile.status;
  const model = todayModel({
    entries,
    moodChecks,
    periods: data.periods,
    cycleSettings: data.cycleSettings,
    dayLogs: data.dayLogs,
    status,
    weeks: profile.weeks ?? null,
    today,
  });
  const lines: string[] = [];
  if (profile.name) lines.push(`Name: ${profile.name}`);
  if (profile.age) lines.push(`Age: ${profile.age}`);
  lines.push(`Today: ${format(parseISO(today), 'EEEE')}, ${day(today)}`);

  if (status === 'pregnant') {
    lines.push(profile.weeks ? `Pregnant, week ${profile.weeks}` : 'Pregnant (week not set)');
  } else if (status === 'postpartum') {
    lines.push('Recently gave birth; Liora does not estimate periods yet');
  } else {
    lines.push('Tracking her cycle (not pregnant)');
    const a = model.answer;
    if (a.kind === 'first_run') lines.push('No period logged yet');
    if ('cycleDay' in a && a.cycleDay) lines.push(`Cycle day: ${a.cycleDay}`);
    if (a.kind === 'period') lines.push(`On her period today (period day ${a.day})`);
    if (a.kind === 'past_window') lines.push('Past her estimated window, no period logged yet');
    const c = model.cycles;
    if (c?.length) lines.push(`Average cycle: ${c.length.average} days (from ${c.length.count} cycles, ${c.length.min} to ${c.length.max})`);
    if (c?.period) lines.push(`Average period: ${c.period.average} days`);
    const last = data.periods.map((p) => p.start).filter((s) => s <= today).sort().at(-1);
    if (last) lines.push(`Last period started: ${day(last)}`);
    const n = model.next;
    if (n) {
      const track = n.track ? `; Liora's window held ${n.track.held} of ${n.track.checked} past cycles` : '';
      lines.push(`Next period: likely ${day(n.next_start)} (window ${day(n.window.from)} to ${day(n.window.to)}), ${n.confidence} confidence${track}`);
    }
    const f = model.fertile;
    if (f) {
      lines.push(`Fertile window (estimate, not contraception): ${day(f.from)} to ${day(f.to)}, ${f.confidence} confidence`);
      lines.push(`Likely ovulation: ${day(f.ovulation.from)} to ${day(f.ovulation.to)}`);
    }
  }

  const since = format(subDays(parseISO(today), RECENT_DAYS - 1), 'yyyy-MM-dd');
  const recent = data.dayLogs.filter((l) => l.date >= since && l.date <= today).sort((x, y) => y.date.localeCompare(x.date));
  if (recent.length) {
    lines.push('Logged in the last 7 days:');
    for (const l of recent) {
      const parts = [
        l.flow ? `flow ${l.flow}` : null,
        l.symptoms.length ? `symptoms ${words(l.symptoms)}` : null,
        l.moods.length ? `mood ${words(l.moods)}` : null,
        l.activities.length ? `activities ${words(l.activities)}` : null,
        l.note ? `note "${l.note.slice(0, 80)}"` : null,
      ].filter(Boolean);
      if (parts.length) lines.push(`- ${day(l.date)}: ${parts.join('; ')}`);
    }
  }

  const noticed = model.patterns.map(pattern).filter((p): p is string => p !== null);
  if (noticed.length) lines.push(`Patterns: ${noticed.join('; ')}`);

  const lastCheck = moodChecks.map((m) => format(parseISO(m.created_at), 'yyyy-MM-dd')).sort().at(-1);
  lines.push(lastCheck ? `Last mood check: ${day(lastCheck)}` : 'Mood check: never done');

  const checkIns = [...entries].sort((x, y) => y.created_at.localeCompare(x.created_at)).slice(0, CHECK_INS);
  if (checkIns.length) {
    lines.push('Recent check-ins with Liora:');
    for (const e of checkIns) lines.push(`- ${day(e.created_at)}: "${e.text.slice(0, 60)}" (${LEVEL[e.decision.level]})`);
  }

  const text = lines.join('\n');
  return { text, facts: { her_data: text } };
}
