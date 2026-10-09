import { addDays, addMonths, format, getDay, getDaysInMonth, parseISO, startOfMonth } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { en } from '../../src/content/copy';
import { cycleDay, cycleHistory, cycleLengths, periodLength, predictNext, resolvePeriodDate } from '../../src/core/cycle';
import type { PeriodRecord } from '../../src/core/types';
import { useLogStore } from '../../src/store/log';
import { useProfile } from '../../src/store/profile';
import { useTellStore } from '../../src/store/tell';
import { CapsuleButton } from '../../src/ui/CapsuleButton';
import { History } from '../../src/ui/calendar/History';
import { SummaryCard } from '../../src/ui/calendar/SummaryCard';
import { Chip } from '../../src/ui/Chip';
import { CycleDay } from '../../src/ui/CycleDay';
import { EntryRow, entryDay } from '../../src/ui/EntryRow';
import { GlassCard } from '../../src/ui/Glass';
import { confirm, tap, warn } from '../../src/ui/haptics';
import { LockGate } from '../../src/ui/LockGate';
import { PressableSurface } from '../../src/ui/PressableSurface';
import { Screen } from '../../src/ui/Screen';
import { Symbol } from '../../src/ui/Symbol';
import { Text } from '../../src/ui/Text';
import { SEPARATOR } from '../../src/ui/theme';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
const short = (s: string) => format(parseISO(s), 'MMM d');
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DEFAULT_CYCLE = 28;

function range(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = parseISO(from); ymd(d) <= to && out.length < 62; d = addDays(d, 1)) out.push(ymd(d));
  return out;
}

export default function CalendarRoute() {
  return (
    <LockGate>
      <Calendar />
    </LockGate>
  );
}

function Calendar() {
  const router = useRouter();
  const entries = useLogStore((s) => s.entries);
  const periods = useLogStore((s) => s.periods);
  const moods = useLogStore((s) => s.moods);
  const settings = useLogStore((s) => s.cycleSettings);
  const status = useTellStore((s) => s.context.status);
  const profile = useProfile();
  const today = ymd(new Date());
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(today);

  const len = periodLength(periods, settings);
  const prediction = useMemo(() => predictNext(periods, settings, today, status), [periods, settings, today, status]);
  const spans = useMemo(() => cycleHistory(periods), [periods]);
  const day = status === 'neither' ? cycleDay(periods, today) : null;
  const avg = useMemo(() => {
    const l = cycleLengths(periods);
    return l.length > 0 ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : (settings.stated_cycle_length ?? DEFAULT_CYCLE);
  }, [periods, settings]);

  const spanOf = (p: PeriodRecord) => {
    const guess = ymd(addDays(parseISO(p.start), len - 1));
    return range(p.start, p.end ?? (guess < today ? guess : today));
  };
  const logged = useMemo(() => {
    const set = new Set<string>();
    for (const p of periods) for (const d of spanOf(p)) set.add(d);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periods, len, today]);
  const estimated = useMemo(() => {
    if (!prediction) return new Set<string>();
    const from = prediction.window.from < prediction.next_start ? prediction.window.from : prediction.next_start;
    return new Set(range(from, prediction.window.to));
  }, [prediction]);
  const dots = useMemo(() => {
    const symptom = new Set<string>();
    const mood = new Set<string>();
    for (const e of entries) {
      const d = entryDay(e);
      if (e.findings.length > 0 || (e.extraction?.symptoms.length ?? 0) > 0) symptom.add(d);
      if ((e.extraction?.moods.length ?? 0) > 0) mood.add(d);
    }
    for (const m of moods) mood.add(format(parseISO(m.created_at), 'yyyy-MM-dd'));
    return { symptom, mood };
  }, [entries, moods]);

  const cells: (number | null)[] = [
    ...Array<null>(getDay(month)).fill(null),
    ...Array.from({ length: getDaysInMonth(month) }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));

  const writePeriods = (next: PeriodRecord[]) => useLogStore.getState().setPeriods(next);
  const markStart = (d: string) => {
    const rest = useLogStore.getState().periods.filter((p) => p.start !== d);
    writePeriods([...rest, { id: `cal-${d}`, start: d, end: null, flow_by_day: {}, source: 'calendar' }]);
    confirm();
  };
  const markEnd = (d: string) => {
    const target = [...useLogStore.getState().periods]
      .filter((p) => p.start <= d)
      .sort((a, b) => b.start.localeCompare(a.start))[0];
    if (!target) return;
    writePeriods(useLogStore.getState().periods.map((p) => (p.id === target.id ? { ...p, end: d } : p)));
    confirm();
  };
  const remove = (id: string) => {
    writePeriods(useLogStore.getState().periods.filter((p) => p.id !== id));
    warn();
  };

  const dayPeriod = periods.find((p) => spanOf(p).includes(selected));
  const dayEntries = entries.filter((e) => entryDay(e) === selected);
  const flowOfDay = dayPeriod ? (dayPeriod.flow_by_day[selected] ?? Object.values(dayPeriod.flow_by_day)[0]) : undefined;
  const dayLabel = (d: string, n: number) =>
    [
      format(parseISO(d), 'MMMM d'),
      logged.has(d) ? en('calendar.day.logged') : estimated.has(d) ? en('calendar.day.estimated') : null,
      d === today ? en('calendar.day.today') : null,
      dots.symptom.has(d) ? en('calendar.day.symptoms') : null,
      dots.mood.has(d) ? en('calendar.day.mood') : null,
    ]
      .filter(Boolean)
      .join(', ') || String(n);

  const step = (n: number) => {
    tap();
    setMonth(addMonths(month, n));
  };
  const openSheet = (params?: { id?: string; date?: string }) => router.push({ pathname: '/period', params });

  return (
    <Screen>
      <View className="gap-lg pt-xl pb-xl">
        <Text variant="displayHeading" accessibilityRole="header">
          {en('calendar.title')}
        </Text>

        <SummaryCard status={status} weeks={profile.weeks} day={day} length={avg} prediction={prediction} />

        {status !== 'pregnant' ? (
          <CapsuleButton label={en('cal.log_period')} onPress={() => openSheet({ date: selected })} />
        ) : null}

        <GlassCard className="p-xs">
          <View className="flex-row items-center justify-between">
            <PressableSurface
              label={en('calendar.prev')}
              onPress={() => step(-1)}
              surfaceClassName="min-h-tap min-w-tap items-center justify-center"
            >
              <Symbol name="chevron.left" fallback="chevronLeft" tone="tint" size={20} />
            </PressableSurface>
            <Text variant="headline" accessibilityRole="header">
              {format(month, 'MMMM yyyy')}
            </Text>
            <PressableSurface
              label={en('calendar.next')}
              onPress={() => step(1)}
              surfaceClassName="min-h-tap min-w-tap items-center justify-center"
            >
              <Symbol name="chevron.right" fallback="chevronRight" tone="tint" size={20} />
            </PressableSurface>
          </View>
          <View className="flex-row">
            {WEEKDAYS.map((w, i) => (
              <View key={i} className="flex-1 items-center pb-xxs">
                <Text variant="caption1" tone="secondary">
                  {w}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((row, r) => (
            <View key={r} className="flex-row">
              {row.map((n, i) => {
                if (n === null) return <View key={i} className="flex-1" />;
                const d = ymd(addDays(month, n - 1));
                return (
                  <CycleDay
                    key={i}
                    num={n}
                    label={dayLabel(d, n)}
                    logged={logged.has(d)}
                    estimated={estimated.has(d)}
                    today={d === today}
                    selected={d === selected}
                    symptom={dots.symptom.has(d)}
                    mood={dots.mood.has(d)}
                    onPress={() => {
                      tap();
                      setSelected(d);
                    }}
                  />
                );
              })}
            </View>
          ))}
        </GlassCard>
        <Text variant="footnote" tone="secondary">
          {en('calendar.legend')}
        </Text>

        <View className="gap-xs">
          <Text variant="title3" accessibilityRole="header">
            {format(parseISO(selected), 'EEEE, MMMM d')}
          </Text>
          <GlassCard className="px-md py-xs">
            {dayPeriod ? (
              <View className="py-sm gap-xs">
                <View className="flex-row items-center gap-xs">
                  <Symbol name="drop.fill" fallback="info" tone="tint" size={18} />
                  <Text variant="headline">{en('cal.day.period')}</Text>
                </View>
                <Text variant="subheadline" tone="secondary">
                  {dayPeriod.end
                    ? fill(en('cal.day.period_range'), { from: short(dayPeriod.start), to: short(dayPeriod.end) })
                    : fill(en('cal.day.ongoing'), { from: short(dayPeriod.start) })}
                  {flowOfDay ? `. ${fill(en('cal.day.flow'), { flow: en(`cal.flow.${flowOfDay}`) })}` : ''}
                </Text>
                <View className="flex-row gap-xs">
                  <Chip label={en('cal.day.edit')} onPress={() => openSheet({ id: dayPeriod.id })} />
                  <Chip label={en('cal.day.delete')} onPress={() => remove(dayPeriod.id)} />
                </View>
              </View>
            ) : null}
            {dayPeriod && dayEntries.length > 0 ? <View className={`h-px ${SEPARATOR}`} /> : null}
            {dayEntries.length === 0 && !dayPeriod ? (
              <Text variant="body" tone="secondary" className="py-sm">
                {en('calendar.no_entries')}
              </Text>
            ) : null}
            {dayEntries.map((e) => {
              const p = e.extraction?.period;
              const date = p ? resolvePeriodDate(p, entryDay(e)) : null;
              return (
                <View key={e.id} className="py-sm gap-xs">
                  <PressableSurface
                    label={`${en('cal.day.open')}: ${e.text}`}
                    role="link"
                    onPress={() => router.push({ pathname: '/result/[id]', params: { id: e.id } })}
                    surfaceClassName="flex-row items-center gap-xs min-h-tap"
                  >
                    <EntryRow entry={e} />
                    <Symbol name="chevron.right" fallback="chevronRight" tone="tertiary" size={14} />
                  </PressableSurface>
                  {p && date && (p.event === 'started' || p.event === 'ended') ? (
                    <View className="flex-row">
                      <Chip
                        label={fill(en(p.event === 'started' ? 'calendar.confirm_start' : 'calendar.confirm_end'), {
                          date: short(date),
                        })}
                        onPress={() => (p.event === 'started' ? markStart(date) : markEnd(date))}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </GlassCard>
        </View>

        <History spans={spans} />
      </View>
    </Screen>
  );
}
