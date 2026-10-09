import { addDays, addMonths, format, getDay, getDaysInMonth, parseISO, startOfMonth } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { en } from '../../src/content/copy';
import { periodLength, predictNext, resolvePeriodDate } from '../../src/core/cycle';
import type { PeriodRecord } from '../../src/core/types';
import { useLogStore } from '../../src/store/log';
import { useTellStore } from '../../src/store/tell';
import { CapsuleButton } from '../../src/ui/CapsuleButton';
import { Chip } from '../../src/ui/Chip';
import { CycleDay } from '../../src/ui/CycleDay';
import { EntryRow, entryDay } from '../../src/ui/EntryRow';
import { Icon } from '../../src/ui/Icon';
import { Lattice } from '../../src/ui/Lattice';
import { PressableSurface } from '../../src/ui/PressableSurface';
import { LockGate } from '../../src/ui/LockGate';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';
import { EDGE, SURFACE } from '../../src/ui/theme';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
const short = (s: string) => format(parseISO(s), 'MMM d');
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  const today = ymd(new Date());
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(today);

  const len = periodLength(periods, settings);
  const prediction = useMemo(() => predictNext(periods, settings, today, status), [periods, settings, today, status]);

  const logged = useMemo(() => {
    const set = new Set<string>();
    for (const p of periods) {
      const guess = ymd(addDays(parseISO(p.start), len - 1));
      for (const d of range(p.start, p.end ?? (guess < today ? guess : today))) set.add(d);
    }
    return set;
  }, [periods, len, today]);
  const estimated = useMemo(
    () => new Set(prediction ? range(prediction.next_start, ymd(addDays(parseISO(prediction.next_start), len - 1))) : []),
    [prediction, len],
  );
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
  const markStart = (day: string) => {
    const rest = useLogStore.getState().periods.filter((p) => p.start !== day);
    writePeriods([...rest, { id: `cal-${day}`, start: day, end: null, flow_by_day: {}, source: 'calendar' }]);
  };
  const openFor = (day: string) =>
    [...useLogStore.getState().periods].filter((p) => p.start <= day).sort((a, b) => b.start.localeCompare(a.start))[0];
  const open = periods.length > 0 ? openFor(selected) : undefined;
  const markEnd = (day: string) => {
    const target = openFor(day);
    if (!target) return;
    writePeriods(useLogStore.getState().periods.map((p) => (p.id === target.id ? { ...p, end: day } : p)));
  };

  const dayEntries = entries.filter((e) => entryDay(e) === selected);
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

  return (
    <Screen>
      <View className="gap-lg pt-xl">
        <Text variant="displayHeading" accessibilityRole="header">
          {en('calendar.title')}
        </Text>

        <View className={`${SURFACE.surface} ${EDGE} rounded-pane p-xs`}>
          <View className="flex-row items-center justify-between">
            <PressableSurface
              label={en('calendar.prev')}
              onPress={() => setMonth(addMonths(month, -1))}
              surfaceClassName="min-h-tap min-w-tap items-center justify-center"
            >
              <Icon name="chevronLeft" tone="tint" />
            </PressableSurface>
            <Text variant="headline" accessibilityRole="header">
              {format(month, 'MMMM yyyy')}
            </Text>
            <PressableSurface
              label={en('calendar.next')}
              onPress={() => setMonth(addMonths(month, 1))}
              surfaceClassName="min-h-tap min-w-tap items-center justify-center"
            >
              <Icon name="chevronRight" tone="tint" />
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
                    onPress={() => setSelected(d)}
                  />
                );
              })}
            </View>
          ))}
        </View>
        <Text variant="footnote" tone="secondary">
          {en('calendar.legend')}
        </Text>

        <View className={`${prediction ? SURFACE.tintSoft : SURFACE.surface} ${EDGE} rounded-pane p-md gap-xxs`}>
          {status !== 'neither' ? (
            <Text variant="body">{en('calendar.no_estimate_status')}</Text>
          ) : prediction ? (
            <>
              <Text variant="headline" tone="tintSoftInk">
                {fill(en('calendar.next_period'), { date: short(prediction.next_start) })}
              </Text>
              <Text variant="subheadline">
                {fill(en('calendar.window'), { from: short(prediction.window.from), to: short(prediction.window.to) })}
              </Text>
              <Text variant="subheadline" tone="secondary">
                {en(`calendar.basis.${prediction.basis}`)}. {en(`calendar.confidence.${prediction.confidence}`)}
              </Text>
              <Text variant="footnote" tone="secondary">
                {en('calendar.not_birth_control')}
              </Text>
            </>
          ) : (
            <Text variant="body" tone="secondary">
              {en('calendar.need_period')}
            </Text>
          )}
        </View>

        <Lattice header={format(parseISO(selected), 'EEEE, MMMM d')}>
          {dayEntries.length === 0 ? (
            <View className="px-md py-sm">
              <Text variant="body" tone="secondary">
                {en('calendar.no_entries')}
              </Text>
            </View>
          ) : (
            dayEntries.map((e) => {
              const p = e.extraction?.period;
              const date = p ? resolvePeriodDate(p, entryDay(e)) : null;
              return (
                <View key={e.id} className="px-md py-sm gap-xs">
                  <EntryRow entry={e} />
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
            })
          )}
          <View className="px-md py-sm gap-xs">
            <CapsuleButton variant="tinted" label={en('calendar.mark_start')} onPress={() => markStart(selected)} />
            <CapsuleButton
              variant="neutral"
              label={en('calendar.mark_end')}
              disabled={!open}
              onPress={() => markEnd(selected)}
            />
          </View>
        </Lattice>

        <CapsuleButton
          variant="plain"
          label={en('result.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </View>
    </Screen>
  );
}
