import { format, getDay, parseISO } from 'date-fns';
import { memo, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { en } from '../../content/copy';
import { markMonth, type CalendarInput, type DayMark } from '../../core/calendar';
import { Text } from '../Text';
import { fill } from './shared';

function firstRun(marks: DayMark[]): { kind: 'logged' | 'estimated'; from: number; to: number } | null {
  const i = marks.findIndex((m) => m.period !== null && m.periodDay === 1);
  const kind = marks[i]?.period;
  if (!kind) return null;
  let j = i;
  while (marks[j + 1]?.period === kind) j++;
  return { kind, from: i + 1, to: j + 1 };
}

function Mini({ mark }: { mark: DayMark }) {
  const logged = mark.period === 'logged';
  const fertile = mark.period ? null : mark.fertile;
  return (
    <View className="flex-1 items-center" style={{ height: 18 }}>
      <View
        className={`h-[17px] w-[17px] items-center justify-center rounded-full ${
          logged
            ? 'bg-tint-fill'
            : mark.period === 'estimated'
              ? 'border border-dashed border-tint dark:border-tint-dark'
              : mark.isToday
                ? 'border border-label-tertiary dark:border-label-tertiary-dark'
                : ''
        }`}
      >
        <Text variant="caption1" tone={logged ? 'onTint' : 'label'} className="text-[9px] leading-[11px]">
          {Number(mark.date.slice(8))}
        </Text>
      </View>
      {fertile ? (
        <View
          className={`absolute bottom-0 h-[3px] rounded-full bg-fertile dark:bg-fertile-dark ${fertile === 'ovulation' ? 'w-[9px]' : 'w-[5px] opacity-70'}`}
        />
      ) : null}
    </View>
  );
}

const MiniMonth = memo(function MiniMonth({
  month,
  input,
  current,
  onOpen,
  marks,
}: {
  month: string;
  input: CalendarInput;
  current: boolean;
  onOpen: (month: string) => void;
  marks: DayMark[];
}) {
  const cells: (DayMark | null)[] = [...Array<null>(getDay(parseISO(`${month}-01`))).fill(null), ...marks];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  const run = firstRun(marks);
  const name = format(parseISO(`${month}-01`), 'MMMM');
  return (
    <Pressable
      onPress={() => onOpen(month)}
      accessibilityRole="button"
      accessibilityLabel={format(parseISO(`${month}-01`), 'MMMM yyyy')}
      className="flex-1 gap-xxs"
    >
      <Text variant="footnote" tone={current ? 'tint' : 'label'} className="font-semibold">
        {name}
      </Text>
      <View>
        {rows.map((row, r) => (
          <View key={r} className="flex-row">
            {row.map((m, i) => (m ? <Mini key={m.date} mark={m} /> : <View key={`b${i}`} className="flex-1" />))}
          </View>
        ))}
      </View>
      <View style={{ minHeight: 18 }}>
        {run ? (
          <Text variant="caption1" tone={run.kind === 'logged' ? 'tint' : 'secondary'} numberOfLines={1}>
            {fill(en(run.kind === 'logged' ? 'cal2.year.period' : 'cal2.year.expected'), { from: run.from, to: run.to })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

function Year({ year, input, thisMonth, onOpen }: { year: number; input: CalendarInput; thisMonth: string; onOpen: (m: string) => void }) {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const marks = useMemo(() => months.map((m) => markMonth(input, m)), [input, year]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => {
    let logged = 0;
    let expected = 0;
    for (const ms of marks) {
      for (const m of ms) {
        if (m.periodDay !== 1) continue;
        if (m.period === 'logged') logged++;
        else if (m.period === 'estimated') expected++;
      }
    }
    return { logged, expected };
  }, [marks]);
  const groups = [0, 1, 2, 3].map((g) => months.slice(g * 3, g * 3 + 3));
  return (
    <View className="gap-md">
      <View className="gap-xxs">
        <Text variant="title2" accessibilityRole="header">
          {year}
        </Text>
        <Text variant="footnote" tone="secondary">
          {fill(en('cal2.year.summary'), counts)}
        </Text>
      </View>
      {groups.map((g, gi) => (
        <View key={gi} className="flex-row gap-sm">
          {g.map((m, i) => (
            <MiniMonth key={m} month={m} input={input} current={m === thisMonth} onOpen={onOpen} marks={marks[gi * 3 + i] ?? []} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function YearView({ input, thisMonth, onOpen, bottomPad }: { input: CalendarInput; thisMonth: string; onOpen: (m: string) => void; bottomPad: number }) {
  const year = Number(thisMonth.slice(0, 4));
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: bottomPad, gap: 28 }}>
      <Year year={year} input={input} thisMonth={thisMonth} onOpen={onOpen} />
      <Year year={year + 1} input={input} thisMonth={thisMonth} onOpen={onOpen} />
    </ScrollView>
  );
}
