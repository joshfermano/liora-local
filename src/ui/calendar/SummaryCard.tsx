import { format, parseISO } from 'date-fns';
import { View } from 'react-native';
import { en } from '../../content/copy';
import type { Context, Prediction } from '../../core/types';
import { GlassCard } from '../Glass';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { CycleRing } from './CycleRing';

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));
const short = (s: string) => format(parseISO(s), 'MMM d');

interface Props {
  status: Context['status'];
  weeks?: number;
  day: number | null;
  length: number;
  prediction: Prediction | null;
}

export function SummaryCard({ status, weeks, day, length, prediction }: Props) {
  if (status === 'pregnant') {
    return (
      <GlassCard className="p-lg gap-xs">
        <View className="flex-row items-center gap-sm">
          <Symbol name="heart.fill" fallback="info" tone="tint" size={26} />
          <Text variant="title2" accessibilityRole="header">
            {weeks ? fill(en('cal.weeks_pregnant'), { n: weeks }) : en('cal.weeks_unknown')}
          </Text>
        </View>
        <Text variant="body" tone="secondary">
          {en('calendar.no_estimate_status')}
        </Text>
      </GlassCard>
    );
  }
  if (status === 'postpartum') {
    return (
      <GlassCard className="p-lg gap-xs">
        <Text variant="body">{en('cal.postpartum')}</Text>
        <Text variant="footnote" tone="secondary">
          {en('calendar.no_estimate_status')}
        </Text>
      </GlassCard>
    );
  }
  if (!prediction || day === null) {
    return (
      <GlassCard className="p-lg">
        <Text variant="body" tone="secondary">
          {en('calendar.need_period')}
        </Text>
      </GlassCard>
    );
  }
  const of = fill(en('cal.of_days'), { n: length });
  return (
    <GlassCard className="p-lg flex-row items-center gap-lg">
      <CycleRing day={day} length={length} label={`${en('cal.cycle_day')} ${day}, ${of}`} />
      <View className="flex-1 gap-xxs">
        <Text variant="footnote" tone="secondary">
          {en('cal.cycle_day')} {day} {of}
        </Text>
        <Text variant="title3">{fill(en('calendar.next_period'), { date: short(prediction.next_start) })}</Text>
        <Text variant="footnote" tone="secondary">
          {fill(en('calendar.window'), { from: short(prediction.window.from), to: short(prediction.window.to) })}
        </Text>
        <Text variant="footnote" tone="secondary">
          {en(`calendar.basis.${prediction.basis}`)}. {en(`calendar.confidence.${prediction.confidence}`)}
        </Text>
        <Text variant="caption1" tone="tertiary">
          {en('calendar.not_birth_control')}
        </Text>
      </View>
    </GlassCard>
  );
}
