import { useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { en } from '../../content/copy';
import type { Insight } from '../../core/insights';
import type { TodayModel } from '../../core/today';
import { FertileLeaf } from '../art';
import { CapsuleButton } from '../CapsuleButton';
import { tap } from '../haptics';
import { useMargin } from '../Screen';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { fill, rangeText, shortDate } from './text';

const GAP = 12;
const PEEK = 36;

export function describe(i: Insight): string {
  switch (i.kind) {
    case 'cycle_length':
      return fill('insight.cycle_length', { days: i.days, cycles: i.cycles });
    case 'cycle_spread':
      return fill('insight.cycle_spread', { min: i.min, max: i.max });
    case 'last_cycle':
      return fill('insight.last_cycle', { days: i.days, average: i.average });
    case 'period_length':
      return fill('insight.period_length', { days: i.days, periods: i.periods });
    case 'recurring':
      return fill('insight.recurring', { what: en(`${i.danger ? 'sign' : 'symptom'}.${i.code}`), count: i.count, days: i.withinDays });
    case 'mood_pattern':
      return fill('insight.mood_pattern', { mood: en(`feeling.${i.mood}`), count: i.count, days: i.withinDays });
    case 'mood_check':
      return i.daysSince === null ? en('insight.mood_check.never') : fill('insight.mood_check.since', { days: i.daysSince });
  }
}

export function GapQuestion({ gap }: { gap: NonNullable<TodayModel['gapQuestion']> }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <View className="gap-sm rounded-pane border border-separator bg-surface-raised p-md dark:border-separator-dark dark:bg-surface-raised-dark">
      <Text variant="headline">{fill('td.gap.question', { date: shortDate(gap.since) })}</Text>
      <Text variant="subheadline" tone="secondary">
        {fill('td.gap.detail', { n: gap.days })}
      </Text>
      <View className="flex-row flex-wrap gap-xs">
        <CapsuleButton
          variant="tinted"
          label={en('td.gap.yes')}
          onPress={() => {
            tap();
            router.push('/period' as Href);
          }}
        />
        <CapsuleButton variant="plain" label={en('td.gap.no')} onPress={() => setHidden(true)} />
      </View>
    </View>
  );
}

function Pane({ width, wash, fertile, children }: { width: number; wash?: boolean; fertile?: boolean; children: ReactNode }) {
  return (
    <View
      style={{ width }}
      className={`min-h-[170px] gap-xs rounded-pane border p-md ${
        fertile
          ? 'border-fertile bg-fertile-soft dark:border-fertile-dark dark:bg-fertile-soft-dark'
          : wash
          ? 'border-tint bg-tint-soft dark:border-tint-dark dark:bg-tint-soft-dark'
          : 'border-separator bg-surface-raised dark:border-separator-dark dark:bg-surface-raised-dark'
      }`}
    >
      {children}
    </View>
  );
}

export function Glance({ model, pregnant }: { model: TodayModel; pregnant: boolean }) {
  const router = useRouter();
  const margin = useMargin();
  const { width } = useWindowDimensions();
  const paneW = Math.min(width, 440) - margin * 2 - PEEK;
  const { next } = model;
  const nextTitle = next
    ? next.inDays <= 0
      ? en('td.next.now')
      : next.inDays === 1
        ? en('td.next.tomorrow')
        : fill('td.next.days', { n: next.inDays })
    : '';
  const observations = model.patterns;
  return (
    <View className="gap-sm">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={paneW + GAP}
        decelerationRate="fast"
        style={{ marginHorizontal: -margin }}
        contentContainerStyle={{ paddingHorizontal: margin, gap: GAP }}
      >
        {next ? (
          <Pane width={paneW} wash>
            <View className="flex-row items-center gap-xs">
              <Symbol name="camera.macro" fallback="info" tone="tintSoftInk" size={18} />
              <Text variant="subheadline" tone="tintSoftInk" className="flex-1">
                {nextTitle}
              </Text>
            </View>
            <Text variant="title2" tone="tintSoftInk">
              {rangeText(next.window.from, next.window.to)}
            </Text>
            <Text variant="subheadline" tone="tintSoftInk">
              {next.basis === 'history' ? fill('td.next.history', { n: next.cycles_used }) : en('td.next.stated')}
            </Text>
            <Text variant="subheadline" tone="tintSoftInk" className="font-semibold">
              {en(`td.confidence_short.${next.confidence}`)}
            </Text>
            {next.track ? (
              <Text variant="footnote" tone="tintSoftInk">
                {fill('td.track', { n: next.track.checked, k: next.track.held })}
              </Text>
            ) : null}
          </Pane>
        ) : null}
        {model.fertile ? (
          <Pane width={paneW} fertile>
            <View className="flex-row items-center gap-xs">
              <FertileLeaf size={18} />
              <Text variant="subheadline" className="flex-1">
                {en('fertile.title')}
              </Text>
            </View>
            <Text variant="title2">{fill('fertile.range', { from: shortDate(model.fertile.from), to: shortDate(model.fertile.to) })}</Text>
            <Text variant="subheadline">
              {fill('fertile.ovulation', { from: shortDate(model.fertile.ovulation.from), to: shortDate(model.fertile.ovulation.to) })}
            </Text>
            <Text variant="subheadline" className="font-bold">
              {en('fertile.not_contraception')}
            </Text>
          </Pane>
        ) : null}
        <Pane width={paneW}>
          <Text variant="headline">{en('td.unwell.title')}</Text>
          <Text variant="subheadline" tone="secondary" className="flex-1">
            {en('td.unwell.body')}
          </Text>
          <View className="items-start">
            <CapsuleButton variant="tinted" label={en('td.unwell.action')} onPress={() => router.push('/liora' as Href)} />
          </View>
        </Pane>
        {observations.map((p, i) => (
          <Pane key={i} width={paneW}>
            <Text variant="body">{describe(p)}</Text>
          </Pane>
        ))}
        {model.cyclesLogged < 2 && !pregnant ? (
          <Pane width={paneW}>
            <Text variant="body" tone="secondary">
              {fill('td.patterns_after', { n: model.cyclesLogged })}
            </Text>
          </Pane>
        ) : null}
      </ScrollView>
    </View>
  );
}
