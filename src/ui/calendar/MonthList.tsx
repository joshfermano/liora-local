import { format, getDay, getDaysInMonth, parseISO } from 'date-fns';
import { memo, useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { en } from '../../content/copy';
import { markMonth, type CalendarInput, type DayMark } from '../../core/calendar';
import { Text } from '../Text';
import { DayCell, ROW_HEIGHT } from './DayCell';

const TITLE = 44;

const rowsOf = (month: string) => Math.ceil((getDay(parseISO(`${month}-01`)) + getDaysInMonth(parseISO(`${month}-01`))) / 7);
const heightOf = (month: string) => TITLE + rowsOf(month) * ROW_HEIGHT + 8;

function dayLabel(m: DayMark): string {
  return [
    format(parseISO(m.date), 'MMMM d'),
    m.isToday ? en('cal2.today') : null,
    m.period === 'logged' ? en('cal2.key.logged') : m.period === 'estimated' ? en('cal2.key.estimated') : null,
  ]
    .filter(Boolean)
    .join(', ');
}

interface BlockProps {
  month: string;
  input: CalendarInput;
  picked: ReadonlySet<string> | null;
  onDay: (date: string) => void;
}

const MonthBlock = memo(function MonthBlock({ month, input, picked, onDay }: BlockProps) {
  const marks = useMemo(() => markMonth(input, month), [input, month]);
  const lead = getDay(parseISO(`${month}-01`));
  const cells: (DayMark | null)[] = [...Array<null>(lead).fill(null), ...marks];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  return (
    <View style={{ height: heightOf(month) }}>
      <View style={{ height: TITLE }} className="items-center justify-end pb-xs">
        <Text variant="headline" accessibilityRole="header">
          {format(parseISO(`${month}-01`), 'MMMM yyyy')}
        </Text>
      </View>
      {rows.map((row, r) => (
        <View key={r} className="flex-row">
          {row.map((m, i) =>
            m ? (
              <DayCell
                key={m.date}
                mark={m}
                label={dayLabel(m)}
                picked={picked?.has(m.date) ?? false}
                editing={picked !== null}
                onPress={onDay}
              />
            ) : (
              <View key={`b${i}`} className="flex-1" />
            ),
          )}
        </View>
      ))}
    </View>
  );
});

export interface MonthListProps {
  months: string[];
  focus: string;
  input: CalendarInput;
  picked: ReadonlySet<string> | null;
  onDay: (date: string) => void;
  thisMonth: string;
  onAway: (away: boolean) => void;
  listRef: RefObject<FlatList<string> | null>;
  bottomPad: number;
}

export function MonthList({ months, focus, input, picked, onDay, thisMonth, onAway, listRef, bottomPad }: MonthListProps) {
  const offsets = useMemo(() => {
    let y = 0;
    return months.map((m) => {
      const at = y;
      y += heightOf(m);
      return at;
    });
  }, [months]);
  const thisIndex = months.indexOf(thisMonth);
  const [initial] = useState(() => Math.max(0, months.indexOf(focus)));
  const away = useRef(false);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const h = e.nativeEvent.layoutMeasurement.height;
      const start = offsets[thisIndex] ?? 0;
      const gone = y > start + heightOf(thisMonth) - 40 || y + h < start + 40;
      if (gone !== away.current) {
        away.current = gone;
        onAway(gone);
      }
    },
    [offsets, thisIndex, thisMonth, onAway],
  );

  return (
    <FlatList
      ref={listRef}
      data={months}
      keyExtractor={(m) => m}
      extraData={picked}
      renderItem={({ item }) => <MonthBlock month={item} input={input} picked={picked} onDay={onDay} />}
      getItemLayout={(_, i) => ({ length: heightOf(months[i] ?? thisMonth), offset: offsets[i] ?? 0, index: i })}
      initialScrollIndex={initial}
      initialNumToRender={3}
      windowSize={5}
      maxToRenderPerBatch={3}
      onScroll={onScroll}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    />
  );
}

export { heightOf as monthHeight };
