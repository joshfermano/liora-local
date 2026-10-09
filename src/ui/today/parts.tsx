import { format, parseISO } from 'date-fns';
import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import type { SFSymbol } from 'expo-symbols';
import { en } from '../../content/copy';
import type { Prediction } from '../../core/types';
import type { Glance } from '../../core/insights';
import { tap } from '../haptics';
import type { IconName } from '../Icon';
import { PressableSurface } from '../PressableSurface';
import { Symbol } from '../Symbol';
import { Text } from '../Text';

export const fill = (key: string, params: Record<string, string | number>) =>
  Object.entries(params).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), en(key));

// One staggered rise per group; the system Reduce Motion setting turns it into a plain appearance.
export function Rise({ order, children }: { order: number; children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(420).delay(order * 110).reduceMotion(ReduceMotion.System)}
      className="gap-xl"
    >
      {children}
    </Animated.View>
  );
}

export function Header({ name }: { name: string }) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-sm">
      <PressableSurface
        className="h-[44px] w-[44px]"
        surfaceClassName="h-[44px] w-[44px] items-center justify-center rounded-full bg-tint dark:bg-tint-dark"
        label={en('tabs.profile')}
        hint={en('today.profile_hint')}
        role="link"
        onPress={() => {
          tap();
          router.navigate('/(tabs)/profile' as Href);
        }}
      >
        <Text variant="headline" tone="onTint">
          {(name.trim()[0] ?? 'L').toUpperCase()}
        </Text>
      </PressableSurface>
      <View className="flex-1">
        <Text variant="headline" numberOfLines={1} accessibilityRole="header">
          {format(new Date(), 'EEEE, d MMMM')}
        </Text>
        {name ? (
          <Text variant="footnote" tone="secondary" numberOfLines={1}>
            {fill('home.greeting', { name })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function CycleStrip({ strip }: { strip: Glance['strip'] }) {
  if (strip.length === 0) return null;
  return (
    <View className="flex-row justify-between">
      {strip.map((d) => {
        const date = parseISO(d.date);
        const ring =
          d.period === 'logged'
            ? 'bg-tint dark:bg-tint-dark border-transparent'
            : d.period === 'estimated'
              ? 'border-dashed border-tint dark:border-tint-dark'
              : d.isToday
                ? 'border-label dark:border-label-dark'
                : 'border-transparent';
        const label = `${format(date, 'EEEE d MMMM')}${d.period ? `, ${d.period}` : ''}${d.checkIns > 0 ? `, ${d.checkIns}` : ''}`;
        return (
          <View key={d.date} accessible accessibilityLabel={label} className="flex-1 items-center gap-xs">
            <Text variant="caption1" tone={d.isToday ? 'label' : 'secondary'} className="uppercase">
              {format(date, 'EEEEE')}
            </Text>
            <View className={`h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] ${ring}`}>
              <Text variant="subheadline" tone={d.period === 'logged' ? 'onTint' : 'label'} className={d.isToday ? 'font-semibold' : ''}>
                {format(date, 'd')}
              </Text>
            </View>
            <View className={`h-[6px] w-[6px] rounded-full ${d.checkIns > 0 ? 'bg-tint dark:bg-tint-dark' : 'bg-transparent'}`} />
          </View>
        );
      })}
    </View>
  );
}

export interface AnswerProps {
  weeks?: number;
  pregnant: boolean;
  day: number | null;
  next: Prediction | null;
}

// The question she opened Today with, answered first and large. Only numbers from her logs.
export function Answer({ pregnant, weeks, day, next }: AnswerProps) {
  let title: string;
  let detail: string | null = null;
  let note: string | null = null;
  if (pregnant && weeks !== undefined) {
    title = fill('today.weeks_title', { n: weeks });
  } else if (day !== null) {
    title = fill('today.cycle_title', { n: day });
    if (next) {
      detail = fill('today.next_around', { date: format(parseISO(next.next_start), 'd MMM') });
      note = fill('today.window', {
        from: format(parseISO(next.window.from), 'd MMM'),
        to: format(parseISO(next.window.to), 'd MMM'),
      });
    }
  } else {
    title = en('today.invite');
    note = en('today.invite_note');
  }
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={[title, detail, note].filter(Boolean).join('. ')} className="gap-xs">
      <Text variant="displayTitle">{title}</Text>
      {detail ? <Text variant="headline">{detail}</Text> : null}
      {note ? (
        <Text variant="subheadline" tone="secondary">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const ACTIONS: { label: string; href: Href; symbol: SFSymbol; fallback: IconName; main?: boolean }[] = [
  { label: 'today.log', href: '/log-day' as Href, symbol: 'plus', fallback: 'check', main: true },
  { label: 'today.talk', href: '/liora', symbol: 'bubble.left.and.text.bubble.right', fallback: 'info' },
  { label: 'home.mood', href: '/mood', symbol: 'face.smiling', fallback: 'info' },
  { label: 'today.checklist', href: '/checklist', symbol: 'checklist', fallback: 'list' },
];

export function Actions() {
  const router = useRouter();
  return (
    <View className="flex-row">
      {ACTIONS.map((a) => (
        <PressableSurface
          key={a.label}
          className="min-w-0 flex-1"
          surfaceClassName="items-center gap-xs py-xxs"
          label={en(a.label)}
          role="link"
          onPress={() => {
            tap();
            router.push(a.href);
          }}
        >
          <View
            className={`h-[60px] w-[60px] items-center justify-center rounded-full border ${
              a.main
                ? 'border-transparent bg-tint dark:bg-tint-dark'
                : 'border-separator bg-surface-raised dark:border-separator-dark dark:bg-surface-raised-dark'
            }`}
          >
            <Symbol name={a.symbol} fallback={a.fallback} tone={a.main ? 'onTint' : 'tint'} size={26} />
          </View>
          <Text variant="footnote" className="text-center" numberOfLines={2}>
            {en(a.label)}
          </Text>
        </PressableSurface>
      ))}
    </View>
  );
}
