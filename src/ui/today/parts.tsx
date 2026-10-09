import { format, parseISO } from 'date-fns';
import { useRouter, type Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { en } from '../../content/copy';
import type { Answer, StripDay, TodayModel } from '../../core/today';
import { tap } from '../haptics';
import type { IconName } from '../Icon';
import { PressableSurface } from '../PressableSurface';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { CapizWindow } from './art';
import { answerText } from './text';

// One staggered rise per group; the system Reduce Motion setting turns it into a plain appearance.
export function Rise({ order, children }: { order: number; children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(420).delay(order * 110).reduceMotion(ReduceMotion.System)}
      style={{ gap: 28 }}
    >
      {children}
    </Animated.View>
  );
}

function RoundLink({ label, href, symbol, fallback, children }: { label: string; href: Href; symbol?: SFSymbol; fallback?: IconName; children?: ReactNode }) {
  const router = useRouter();
  return (
    <PressableSurface
      className="h-tap w-tap"
      surfaceClassName="h-tap w-tap items-center justify-center rounded-full border border-separator bg-surface-raised dark:border-separator-dark dark:bg-surface-raised-dark"
      label={label}
      role="link"
      onPress={() => {
        tap();
        router.push(href);
      }}
    >
      {children ?? (symbol ? <Symbol name={symbol} fallback={fallback} tone="tint" size={20} /> : null)}
    </PressableSurface>
  );
}

export function Header({ initial }: { initial: string }) {
  return (
    <View className="flex-row items-center justify-between gap-sm">
      <RoundLink label={en('td.open_profile')} href={'/(tabs)/profile' as Href}>
        <Text variant="headline" tone="tint">
          {initial}
        </Text>
      </RoundLink>
      <Text variant="headline" numberOfLines={1} accessibilityRole="header" className="flex-1 text-center">
        {format(new Date(), 'EEEE, MMMM d')}
      </Text>
      <RoundLink label={en('td.open_calendar')} href={'/(tabs)/calendar' as Href} symbol="calendar" fallback="calendar" />
    </View>
  );
}

function Day({ d }: { d: StripDay }) {
  const date = parseISO(d.date);
  const inner =
    d.period === 'logged'
      ? 'border-transparent bg-tint dark:bg-tint-dark'
      : d.period === 'estimated'
        ? 'border-dashed border-tint dark:border-tint-dark'
        : 'border-transparent';
  const label = `${format(date, 'EEEE, MMMM d')}${d.period ? `, ${d.period}` : ''}`;
  return (
    <View accessible accessibilityLabel={label} className="flex-1 items-center">
      <View className={`h-[42px] w-[42px] items-center justify-center rounded-full border ${d.isToday ? 'border-label dark:border-label-dark' : 'border-transparent'}`}>
        <View className={`h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] ${inner}`}>
          <Text variant="subheadline" tone={d.period === 'logged' ? 'onTint' : 'label'} className={d.isToday ? 'font-semibold' : ''}>
            {format(date, 'd')}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function Strip({ strip }: { strip: StripDay[] }) {
  if (strip.length === 0) return null;
  const rows = [strip.slice(0, 7), strip.slice(7, 14)];
  return (
    <View className="gap-xs">
      <View className="flex-row" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {strip.slice(0, 7).map((d) => (
          <View key={d.date} className="flex-1 items-center">
            <Text variant="caption1" tone="secondary">
              {format(parseISO(d.date), 'EEEEE')}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, i) =>
        row.length ? (
          <View key={i} className="flex-row">
            {row.map((d) => (
              <Day key={d.date} d={d} />
            ))}
          </View>
        ) : null,
      )}
    </View>
  );
}

export function AnswerBlock({ answer }: { answer: Answer }) {
  const a = answerText(answer);
  const conf = a.confidence ? en(`td.confidence.${a.confidence}`) : null;
  return (
    <View className="flex-row items-center gap-md">
      <View className="flex-1 gap-xs" accessible accessibilityRole="header" accessibilityLabel={[a.title, a.cycleDay ? en('td.cycle_day').replace('{n}', String(a.cycleDay)) : null, a.sub, conf].filter(Boolean).join('. ')}>
        <Text variant="displayTitle">{a.title}</Text>
        {a.cycleDay !== null ? (
          <View className="flex-row items-center gap-xs">
            <Symbol name="moon.fill" fallback="info" tone="tint" size={16} />
            <Text variant="headline">{en('td.cycle_day').replace('{n}', String(a.cycleDay))}</Text>
          </View>
        ) : null}
        {a.sub ? (
          <Text variant="subheadline" tone="secondary">
            {a.sub}
          </Text>
        ) : null}
        {conf ? (
          <Text variant="subheadline" tone="secondary">
            {conf}
          </Text>
        ) : null}
      </View>
      <CapizWindow width={64} />
    </View>
  );
}

const ACTIONS: { label: string; symbol: SFSymbol; fallback: IconName; key: keyof TodayModel['loggedToday'] | null }[] = [
  { label: 'td.action.period', symbol: 'drop.fill', fallback: 'info', key: 'period' },
  { label: 'td.action.symptoms', symbol: 'bandage', fallback: 'info', key: 'symptoms' },
  { label: 'td.action.mood', symbol: 'face.smiling', fallback: 'info', key: 'mood' },
  { label: 'td.action.more', symbol: 'ellipsis', fallback: 'list', key: null },
];

export function Actions({ logged }: { logged: TodayModel['loggedToday'] }) {
  const router = useRouter();
  return (
    <View className="flex-row">
      {ACTIONS.map((a, i) => {
        const done = a.key ? logged[a.key] : false;
        const main = i === 0;
        return (
          <PressableSurface
            key={a.label}
            className="min-w-0 flex-1"
            surfaceClassName="items-center gap-xs py-xxs"
            label={done ? `${en(a.label)}. ${en('td.action.done')}` : en(a.label)}
            role="link"
            onPress={() => {
              tap();
              router.push('/log-day' as Href);
            }}
          >
            <View>
              <View
                className={`h-[60px] w-[60px] items-center justify-center rounded-full border ${
                  main
                    ? 'border-transparent bg-tint dark:bg-tint-dark'
                    : 'border-separator bg-surface-raised dark:border-separator-dark dark:bg-surface-raised-dark'
                }`}
              >
                <Symbol name={a.symbol} fallback={a.fallback} tone={main ? 'onTint' : 'tint'} size={26} />
              </View>
              {done ? (
                <View
                  className="absolute -right-xxs -top-xxs h-[22px] w-[22px] items-center justify-center rounded-full border border-separator bg-surface-raised dark:border-separator-dark dark:bg-surface-raised-dark"
                  accessibilityElementsHidden
                >
                  <Symbol name="checkmark" fallback="check" tone="tint" size={11} />
                </View>
              ) : null}
            </View>
            <Text variant="footnote" className="text-center" numberOfLines={2}>
              {en(a.label)}
            </Text>
          </PressableSurface>
        );
      })}
    </View>
  );
}
