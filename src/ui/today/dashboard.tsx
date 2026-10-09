import { format, parseISO } from 'date-fns';
import { useRouter, type Href } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import { CARDS } from '../../content/cards';
import { en } from '../../content/copy';
import { stageFor } from '../../ai/retrieval';
import { cycleHistory } from '../../core/cycle';
import { glance, insights, type Glance, type Insight, type InsightInput } from '../../core/insights';
import { useLogStore } from '../../store/log';
import { contextFrom, useProfile } from '../../store/profile';
import { GlassCard } from '../Glass';
import { tap } from '../haptics';
import type { IconName } from '../Icon';
import { PressableSurface } from '../PressableSurface';
import { SourceCard } from '../SourceCard';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { fill } from './parts';

export function useToday() {
  const entries = useLogStore((s) => s.entries);
  const moodChecks = useLogStore((s) => s.moods);
  const periods = useLogStore((s) => s.periods);
  const cycleSettings = useLogStore((s) => s.cycleSettings);
  const profile = useProfile();
  const today = format(new Date(), 'yyyy-MM-dd');
  return useMemo(() => {
    const input: InsightInput = { entries, moodChecks, periods, cycleSettings, status: profile.status, today };
    return { glance: glance(input), insights: insights(input), today, profile, periods, cycleSettings };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, moodChecks, periods, cycleSettings, profile.status, profile.weeks, today]);
}

function SectionTitle({ children, note }: { children: string; note?: string }) {
  return (
    <View className="gap-xxs px-xxs">
      <Text variant="footnote" tone="secondary" className="uppercase" accessibilityRole="header">
        {children}
      </Text>
      {note ? (
        <Text variant="caption1" tone="tertiary">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

function Tile({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="basis-[47%] grow">
      <GlassCard className="min-h-[112px] gap-xs p-md">
        <Text variant="footnote" tone="secondary">
          {title}
        </Text>
        {children}
      </GlassCard>
    </View>
  );
}

function Stat({ value, title }: { value: number | null; title: string }) {
  return (
    <Tile title={title}>
      {value === null ? (
        <Text variant="subheadline" tone="tertiary">
          {en('glance.none')}
        </Text>
      ) : (
        <Text variant="title1" className="tabular-nums">
          {fill('glance.days', { n: value })}
        </Text>
      )}
    </Tile>
  );
}

function CheckIns({ c }: { c: Glance['checkIns'] }) {
  const parts = [
    { n: c.go_now, bar: 'bg-urgent dark:bg-urgent-dark', label: 'glance.level.go_now' },
    { n: c.follow_up, bar: 'bg-tint dark:bg-tint-dark', label: 'glance.level.follow_up' },
    { n: c.ok, bar: 'bg-label-tertiary dark:bg-label-tertiary-dark', label: 'glance.level.ok' },
  ];
  return (
    <Tile title={en('glance.checkins')}>
      {c.total === 0 ? (
        <Text variant="subheadline" tone="tertiary">
          {en('glance.none')}
        </Text>
      ) : (
        <View accessible accessibilityLabel={parts.map((p) => `${en(p.label)} ${p.n}`).join(', ')} className="gap-sm">
          <Text variant="title1" className="tabular-nums">
            {c.total}
          </Text>
          <View className="h-[8px] flex-row gap-[2px] overflow-hidden rounded-full">
            {parts.map((p) =>
              p.n > 0 ? <View key={p.label} style={{ flex: p.n }} className={`h-[8px] ${p.bar}`} /> : null,
            )}
          </View>
        </View>
      )}
    </Tile>
  );
}

function Moods({ moods }: { moods: Glance['moods'] }) {
  const top = moods.slice(0, 3);
  const max = Math.max(1, ...top.map((m) => m.count));
  return (
    <Tile title={en('glance.moods')}>
      {top.length === 0 ? (
        <Text variant="subheadline" tone="tertiary">
          {en('glance.none')}
        </Text>
      ) : (
        <View className="gap-xs">
          {top.map((m) => (
            <View key={m.mood} accessible accessibilityLabel={`${en(`feeling.${m.mood}`)} ${m.count}`} className="gap-[2px]">
              <Text variant="caption1">{en(`feeling.${m.mood}`)}</Text>
              <View className="h-[5px] rounded-full bg-fill dark:bg-fill-dark">
                <View style={{ width: `${(m.count / max) * 100}%` }} className="h-[5px] rounded-full bg-tint dark:bg-tint-dark" />
              </View>
            </View>
          ))}
        </View>
      )}
    </Tile>
  );
}

export function GlanceTiles({ g }: { g: Glance }) {
  return (
    <View className="gap-xs">
      <SectionTitle>{en('glance.title')}</SectionTitle>
      <View className="flex-row flex-wrap gap-sm">
        <CheckIns c={g.checkIns} />
        <Moods moods={g.moods} />
      </View>
    </View>
  );
}

const MAX_DOTS = 45;

// One cycle as a line of days: the days of the period filled, the rest open.
function CycleLine({ start, length, periodDays, today, average }: { start: string; length: number | null; periodDays: number; today: string; average: number | null }) {
  const running = length === null;
  const elapsed = Math.max(1, Math.round((parseISO(today).getTime() - parseISO(start).getTime()) / 86_400_000) + 1);
  const total = Math.min(MAX_DOTS, running ? Math.max(elapsed, average ?? 28) : length);
  const value = running ? en('today.now') : fill('glance.days', { n: length });
  return (
    <View accessible accessibilityLabel={`${format(parseISO(start), 'd MMM')}, ${value}`} className="gap-xs">
      <View className="flex-row justify-between">
        <Text variant="subheadline">{format(parseISO(start), 'd MMM yyyy')}</Text>
        <Text variant="subheadline" tone="secondary" className="tabular-nums">
          {value}
        </Text>
      </View>
      <View className="flex-row">
        {Array.from({ length: total }, (_, i) => (
          <View key={i} className="flex-1 items-center">
            <View
              className={`h-[7px] w-[7px] rounded-full ${
                i < periodDays
                  ? 'bg-tint dark:bg-tint-dark'
                  : running && i >= elapsed
                    ? 'border border-label-tertiary dark:border-label-tertiary-dark'
                    : 'bg-label-tertiary dark:bg-label-tertiary-dark'
              }`}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export function Cycles({ g, periods, today }: { g: Glance; periods: InsightInput['periods']; today: string }) {
  const history = useMemo(() => cycleHistory(periods).slice(0, 4), [periods]);
  if (!g.cycle || history.length === 0) return null;
  const c = g.cycle;
  return (
    <View className="gap-xs">
      <SectionTitle>{en('today.cycles_title')}</SectionTitle>
      <View className="flex-row flex-wrap gap-sm">
        <Stat title={en('glance.average_cycle')} value={c.averageLength} />
        <Stat title={en('glance.last_cycle')} value={c.lastLength} />
        <Stat title={en('glance.period_length')} value={c.periodLength} />
      </View>
      <GlassCard className="gap-md p-md">
        {history.map((h) => (
          <CycleLine key={h.start} start={h.start} length={h.length} periodDays={c.periodLength ?? 5} today={today} average={c.averageLength} />
        ))}
      </GlassCard>
    </View>
  );
}

const SYMBOL: Record<Insight['kind'], { name: SFSymbol; fallback: IconName }> = {
  cycle_length: { name: 'calendar', fallback: 'info' },
  cycle_spread: { name: 'arrow.left.and.right', fallback: 'info' },
  last_cycle: { name: 'clock.arrow.circlepath', fallback: 'info' },
  period_length: { name: 'drop', fallback: 'info' },
  recurring: { name: 'repeat', fallback: 'info' },
  mood_pattern: { name: 'face.smiling', fallback: 'info' },
  mood_check: { name: 'heart.text.square', fallback: 'info' },
};

function describe(i: Insight): { text: string; extra?: string; action?: { label: string; href: Href } } {
  switch (i.kind) {
    case 'cycle_length':
      return { text: fill('insight.cycle_length', { days: i.days, cycles: i.cycles }) };
    case 'cycle_spread':
      return { text: fill('insight.cycle_spread', { min: i.min, max: i.max }) };
    case 'last_cycle':
      return { text: fill('insight.last_cycle', { days: i.days, average: i.average }) };
    case 'period_length':
      return { text: fill('insight.period_length', { days: i.days, periods: i.periods }) };
    case 'recurring':
      return {
        text: fill('insight.recurring', {
          what: en(`${i.danger ? 'sign' : 'symptom'}.${i.code}`),
          count: i.count,
          days: i.withinDays,
        }),
        ...(i.danger ? { extra: en('insight.recurring.danger'), action: { label: 'today.talk', href: '/liora' as Href } } : {}),
      };
    case 'mood_pattern':
      return { text: fill('insight.mood_pattern', { mood: en(`feeling.${i.mood}`), count: i.count, days: i.withinDays }) };
    case 'mood_check':
      return {
        text: i.daysSince === null ? en('insight.mood_check.never') : fill('insight.mood_check.since', { days: i.daysSince }),
        action: { label: 'home.mood', href: '/mood' as Href },
      };
  }
}

export function Noticed({ list }: { list: Insight[] }) {
  const router = useRouter();
  return (
    <View className="gap-xs">
      <SectionTitle note={en('insight.basis')}>{en('insight.title')}</SectionTitle>
      {list.length === 0 ? (
        <GlassCard className="p-md">
          <Text variant="subheadline" tone="secondary">
            {en('insight.empty')}
          </Text>
        </GlassCard>
      ) : (
        list.map((i, n) => {
          const d = describe(i);
          const danger = i.kind === 'recurring' && i.danger;
          const action = d.action;
          return (
            <GlassCard key={`${i.kind}-${n}`} className="flex-row gap-md p-md">
              <Symbol name={SYMBOL[i.kind].name} fallback={SYMBOL[i.kind].fallback} tone={danger ? 'urgent' : 'tint'} size={24} />
              <View className="flex-1 gap-xs">
                <Text variant="body">{d.text}</Text>
                {d.extra ? (
                  <Text variant="subheadline" tone="secondary">
                    {d.extra}
                  </Text>
                ) : null}
                {action ? (
                  <PressableSurface
                    className="min-h-tap justify-center self-start"
                    label={en(action.label)}
                    role="link"
                    onPress={() => {
                      tap();
                      router.push(action.href);
                    }}
                  >
                    <Text variant="headline" tone="tint">
                      {en(action.label)}
                    </Text>
                  </PressableSurface>
                ) : null}
              </View>
            </GlassCard>
          );
        })
      )}
    </View>
  );
}

// One reviewed card a day, chosen by the date so it holds still while she reads.
export function CardOfDay({ today }: { today: string }) {
  const profile = useProfile();
  const stage = profile.status === 'neither' ? null : stageFor(contextFrom(profile));
  const card = useMemo(() => {
    const pool = CARDS.filter((c) => !/medication/.test(c.id) && (!stage || c.stage === stage));
    if (pool.length === 0) return null;
    const day = Math.floor(parseISO(today).getTime() / 86_400_000);
    return pool[((day % pool.length) + pool.length) % pool.length];
  }, [today, stage]);
  if (!card) return null;
  return (
    <View className="gap-xs">
      <SectionTitle>{en('today.card_title')}</SectionTitle>
      <SourceCard card={card} />
    </View>
  );
}
