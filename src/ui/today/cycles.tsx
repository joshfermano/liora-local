import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { en } from '../../content/copy';
import type { CycleRow, DotKind, TodayModel } from '../../core/today';
import { CapsuleButton } from '../CapsuleButton';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';
import { EDGE, SEPARATOR, SURFACE } from '../theme';
import { describe } from './glance';
import { days, fill, shortDate } from './text';

type Cycles = NonNullable<TodayModel['cycles']>;

function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <View className="flex-1 gap-xxs p-md">
      <Text variant="footnote" tone="secondary">
        {title}
      </Text>
      <Text variant="headline">{value}</Text>
      {sub ? (
        <Text variant="footnote" tone="secondary">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function Pair({ children }: { children: [React.ReactNode, React.ReactNode] }) {
  return (
    <View className="flex-row">
      {children[0]}
      <View className={`w-px ${SEPARATOR}`} />
      {children[1]}
    </View>
  );
}

export function Stats({ cycles }: { cycles: Cycles }) {
  const { length, period, last, symptomsThisCycle } = cycles;
  const none = en('td.none');
  return (
    <View className={`${SURFACE.surface} ${EDGE} overflow-hidden rounded-pane`}>
      <Pair>
        {[
          <Stat
            key="len"
            title={en('td.cycle_length')}
            value={length ? (length.min === length.max ? days(length.min) : fill('td.cycle_length.range', { min: length.min, max: length.max })) : none}
            sub={length ? fill('td.cycle_length.sub', { avg: Math.round(length.average), n: length.count }) : undefined}
          />,
          <Stat
            key="per"
            title={en('td.period_length')}
            value={period ? fill('td.period_length.value', { n: Math.round(period.average) }) : none}
            sub={period ? fill('td.period_length.sub', { n: period.count }) : undefined}
          />,
        ]}
      </Pair>
      <View className={`h-px ${SEPARATOR}`} />
      <Pair>
        {[
          <Stat key="last" title={en('td.last_cycle')} value={last === null ? none : days(last)} sub={last === null ? undefined : en('td.last_cycle.sub')} />,
          <Stat key="sym" title={en('td.symptoms_cycle')} value={fill('td.symptoms_cycle.value', { n: symptomsThisCycle })} />,
        ]}
      </Pair>
    </View>
  );
}

const DOT: Record<DotKind, string> = {
  period: 'h-[8px] w-[8px] rounded-full bg-tint dark:bg-tint-dark',
  estimated: 'h-[8px] w-[8px] rounded-full border-[1.5px] border-tint dark:border-tint-dark',
  day: 'h-[4px] w-[4px] rounded-full bg-label-tertiary dark:bg-label-tertiary-dark',
  ahead: 'h-[6px] w-[6px] rounded-full border border-label-tertiary dark:border-label-tertiary-dark',
};

function Row({ row }: { row: CycleRow }) {
  const title = row.end === null ? fill('td.row.current', { date: shortDate(row.start) }) : fill('td.row.range', { from: shortDate(row.start), to: shortDate(row.end) });
  const right = row.end === null ? (row.day === null ? '' : fill('td.row.day', { n: row.day })) : row.length === null ? '' : days(row.length);
  return (
    <View className="gap-xs p-md" accessible accessibilityLabel={`${title}. ${right}`}>
      <View className="flex-row items-baseline justify-between gap-sm">
        <Text variant="subheadline" className="flex-1">
          {title}
        </Text>
        <Text variant="subheadline" tone="secondary">
          {right}
        </Text>
      </View>
      <View className="flex-row flex-wrap items-center gap-[4px]">
        {row.dots.map((k, i) => (
          <View key={i} className="h-[8px] w-[8px] items-center justify-center">
            <View className={DOT[k]} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function Rows({ rows }: { rows: CycleRow[] }) {
  const router = useRouter();
  return (
    <View className="gap-xs">
      <View className={`${SURFACE.surface} ${EDGE} overflow-hidden rounded-pane`}>
        {rows.map((r) => (
          <View key={r.start}>
            <Row row={r} />
            <View className={`h-px ${SEPARATOR}`} />
          </View>
        ))}
        <PressableSurface
          label={en('td.see_calendar')}
          role="link"
          className="min-h-tap"
          surfaceClassName="min-h-tap items-center justify-center"
          onPress={() => router.push('/(tabs)/calendar' as Href)}
        >
          <Text variant="headline" tone="tint">
            {en('td.see_calendar')}
          </Text>
        </PressableSurface>
      </View>
      <View className="flex-row gap-md px-xs" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View className="flex-row items-center gap-xxs">
          <View className={DOT.period} />
          <Text variant="caption1" tone="secondary">
            {en('td.key.period')}
          </Text>
        </View>
        <View className="flex-row items-center gap-xxs">
          <View className={DOT.estimated} />
          <Text variant="caption1" tone="secondary">
            {en('td.key.estimated')}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function Deeper({ model }: { model: TodayModel }) {
  const router = useRouter();
  const list = model.patterns.filter((p) => p.kind === 'recurring' || p.kind === 'mood_pattern');
  if (list.length === 0) return null;
  return (
    <View className="gap-xs">
      <Text variant="footnote" tone="secondary" accessibilityRole="header" className="px-md">
        {en('td.deeper')}
      </Text>
      <View className={`${SURFACE.surface} ${EDGE} overflow-hidden rounded-pane`}>
        {list.map((p, i) => (
          <View key={i}>
            {i > 0 ? <View className={`h-px ${SEPARATOR}`} /> : null}
            <View className="items-start gap-xs p-md">
              <Text variant="body">{describe(p)}</Text>
              {p.kind === 'recurring' && p.danger ? (
                <>
                  <Text variant="subheadline" tone="secondary">
                    {en('insight.recurring.danger')}
                  </Text>
                  <CapsuleButton variant="tinted" label={en('td.unwell.action')} onPress={() => router.push('/liora' as Href)} />
                </>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
