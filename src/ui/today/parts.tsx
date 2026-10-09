import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import { en } from '../../content/copy';
import { predictNext } from '../../core/cycle';
import { useLogStore } from '../../store/log';
import { useProfile } from '../../store/profile';
import { GlassCard } from '../Glass';
import { tap } from '../haptics';
import type { IconName } from '../Icon';
import { PressableSurface } from '../PressableSurface';
import { Symbol } from '../Symbol';
import { Text } from '../Text';

// Weeks pregnant, or the cycle day and the next period from what she logged. Nothing else is said.
export function StatusCard() {
  const profile = useProfile();
  const periods = useLogStore((s) => s.periods);
  const settings = useLogStore((s) => s.cycleSettings);
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  if (profile.status === 'pregnant' && profile.weeks !== undefined) {
    return (
      <GlassCard className="gap-xxs p-lg">
        <Text variant="footnote" tone="secondary">
          {en('nurse.weeks')}
        </Text>
        <Text variant="display">{profile.weeks}</Text>
      </GlassCard>
    );
  }
  const last = periods.map((p) => p.start).sort().at(-1);
  if (!last || (profile.status && profile.status !== 'neither')) return null;
  const day = differenceInCalendarDays(parseISO(today), parseISO(last)) + 1;
  const next = predictNext(periods, settings, today, 'neither');
  return (
    <GlassCard className="gap-xs p-lg">
      <View className="gap-xxs">
        <Text variant="footnote" tone="secondary">
          {en('today.cycle_day')}
        </Text>
        <Text variant="display">{Math.max(day, 1)}</Text>
      </View>
      {next ? (
        <Text variant="subheadline" tone="secondary">
          {en('today.next_period')} {format(parseISO(next.next_start), 'd MMM')}
        </Text>
      ) : null}
    </GlassCard>
  );
}

const ACTIONS: { label: string; href: Href; symbol: SFSymbol; fallback: IconName }[] = [
  { label: 'home.mood', href: '/mood', symbol: 'face.smiling', fallback: 'info' },
  { label: 'today.checklist', href: '/checklist', symbol: 'checklist', fallback: 'list' },
  { label: 'home.log', href: '/log', symbol: 'book.closed', fallback: 'list' },
  { label: 'today.talk', href: '/liora', symbol: 'bubble.left.and.text.bubble.right', fallback: 'info' },
];

export function QuickActions() {
  const router = useRouter();
  return (
    <View className="gap-xs">
      <Text variant="footnote" tone="secondary" className="px-xxs uppercase" accessibilityRole="header">
        {en('today.quick')}
      </Text>
      <View className="flex-row flex-wrap gap-sm">
        {ACTIONS.map((a) => (
          <PressableSurface
            key={a.label}
            className="basis-[47%] grow"
            label={en(a.label)}
            role="link"
            onPress={() => {
              tap();
              router.push(a.href);
            }}
          >
            <GlassCard interactive className="min-h-[96px] justify-between gap-sm p-md">
              <Symbol name={a.symbol} fallback={a.fallback} tone="tint" size={26} />
              <Text variant="headline">{en(a.label)}</Text>
            </GlassCard>
          </PressableSurface>
        ))}
      </View>
    </View>
  );
}
