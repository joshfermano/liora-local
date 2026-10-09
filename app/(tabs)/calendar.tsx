import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-screens/experimental';
import { en } from '../../src/content/copy';
import { loggedDays, periodsFromDays, toggleDay, usualLength } from '../../src/core/calendar';
import { useLogStore } from '../../src/store/log';
import { MonthList } from '../../src/ui/calendar/MonthList';
import { fill, monthRange, useCalendarInput } from '../../src/ui/calendar/shared';
import { YearView } from '../../src/ui/calendar/YearView';
import { GlassCard } from '../../src/ui/Glass';
import { confirm, tap } from '../../src/ui/haptics';
import { LockGate } from '../../src/ui/LockGate';
import { SegmentedControl } from '../../src/ui/native/SegmentedControl';
import { PressableSurface } from '../../src/ui/PressableSurface';
import { Text } from '../../src/ui/Text';
import { SEPARATOR, SURFACE } from '../../src/ui/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const TAB_BAR_CLEARANCE = 64;

// iOS measures the real tab bar, so the gap above it matches the 8pt under the top bar.
function FloatAboveTabBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const row = (
    <View pointerEvents="box-none" className="items-center pb-xs">
      {children}
    </View>
  );
  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView edges={{ bottom: true }} pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flex: 0 }}>
        {row}
      </SafeAreaView>
    );
  }
  return (
    <View pointerEvents="box-none" className="absolute inset-x-0" style={{ bottom: insets.bottom + TAB_BAR_CLEARANCE }}>
      {row}
    </View>
  );
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
  const insets = useSafeAreaInsets();
  const input = useCalendarInput();
  const { today, periods, cycleSettings, status } = input;
  const thisMonth = today.slice(0, 7);
  const months = useMemo(() => monthRange(new Date()), []);
  const usual = useMemo(() => usualLength(periods, cycleSettings), [periods, cycleSettings]);
  const listRef = useRef<FlatList<string>>(null);

  const [view, setView] = useState<'month' | 'year'>('month');
  const [focus, setFocus] = useState(thisMonth);
  const [away, setAway] = useState(false);
  const [days, setDays] = useState<string[] | null>(null);
  const picked = useMemo(() => (days ? new Set(days) : null), [days]);
  const editing = days !== null;

  const onDay = useCallback(
    (date: string) => {
      tap();
      if (days) setDays(toggleDay(days, date, usual, today));
      else router.push({ pathname: '/day', params: { date } });
    },
    [days, usual, today, router],
  );
  const startEdit = () => {
    tap();
    setDays(loggedDays(periods, usual, today));
  };
  const save = () => {
    if (!days) return;
    useLogStore.getState().setPeriods(periodsFromDays(days, periods));
    confirm();
    setDays(null);
  };
  const cancel = () => {
    tap();
    setDays(null);
  };
  const backToToday = () => {
    tap();
    listRef.current?.scrollToIndex({ index: months.indexOf(thisMonth), animated: true });
  };
  const openMonth = (m: string) => {
    tap();
    setFocus(m);
    setView('month');
    setAway(m > thisMonth);
  };

  const listPad = insets.bottom + TAB_BAR_CLEARANCE + 92;

  return (
    <View className={`flex-1 ${SURFACE.ground}`}>
      <View style={{ paddingTop: insets.top + 8 }} className={`border-b border-separator pb-xs dark:border-separator-dark ${SURFACE.ground}`}>
        {editing ? (
          <View className="items-center gap-xxs px-md pb-xs pt-xs">
            <Text variant="headline" className="text-center" accessibilityRole="header">
              {en('cal2.edit.title')}
            </Text>
            <Text variant="footnote" tone="secondary" className="text-center">
              {fill(en('cal2.edit.sub'), { n: usual })}
            </Text>
          </View>
        ) : (
          <View className="px-md">
            <SegmentedControl
              label={en('calendar.title')}
              options={[
                { label: en('cal2.month'), value: 'month' },
                { label: en('cal2.year'), value: 'year' },
              ]}
              value={view}
              onChange={(v) => {
                setFocus(thisMonth);
                setAway(false);
                setView(v as 'month' | 'year');
              }}
            />
          </View>
        )}
        {view === 'month' ? (
          <View className="flex-row px-xs pt-xs">
            {WEEKDAYS.map((w, i) => (
              <View key={i} className="flex-1 items-center" importantForAccessibility="no-hide-descendants">
                <Text variant="caption1" tone="secondary">
                  {w}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {status === 'pregnant' && !editing ? (
        <Text variant="footnote" tone="secondary" className="px-md pt-xs text-center">
          {en('cal2.pregnant')}
        </Text>
      ) : null}

      <View className="flex-1">
        {view === 'month' ? (
          <MonthList
            months={months}
            focus={focus}
            input={input}
            picked={picked}
            onDay={onDay}
            thisMonth={thisMonth}
            onAway={setAway}
            listRef={listRef}
            bottomPad={listPad}
          />
        ) : (
          <YearView input={input} thisMonth={thisMonth} onOpen={openMonth} bottomPad={listPad} />
        )}

        {view === 'month' && away && !editing ? (
          <View pointerEvents="box-none" className="absolute inset-x-0 top-xs items-center">
            <GlassCard interactive>
              <PressableSurface label={en('cal2.back_today')} onPress={backToToday} surfaceClassName="min-h-tap items-center justify-center px-md">
                <Text variant="subheadline" tone="tint" className="font-semibold">
                  {en('cal2.back_today')}
                </Text>
              </PressableSurface>
            </GlassCard>
          </View>
        ) : null}
      </View>

      {view === 'month' ? (
        <FloatAboveTabBar>
          <GlassCard interactive style={{ borderRadius: 25 }}>
            {editing ? (
              <View className="flex-row items-center">
                <PressableSurface label={en('cal2.cancel')} onPress={cancel} surfaceClassName="min-h-capsule min-w-[112px] items-center justify-center px-lg">
                  <Text variant="headline" tone="secondary">
                    {en('cal2.cancel')}
                  </Text>
                </PressableSurface>
                <View className={`h-6 w-px ${SEPARATOR}`} />
                <PressableSurface label={en('cal2.save')} onPress={save} surfaceClassName="min-h-capsule min-w-[112px] items-center justify-center px-lg">
                  <Text variant="headline" tone="tint">
                    {en('cal2.save')}
                  </Text>
                </PressableSurface>
              </View>
            ) : (
              <PressableSurface label={en('cal2.edit')} onPress={startEdit} surfaceClassName="min-h-capsule items-center justify-center px-xl">
                <Text variant="headline" tone="tint">
                  {en('cal2.edit')}
                </Text>
              </PressableSurface>
            )}
          </GlassCard>
        </FloatAboveTabBar>
      ) : null}
    </View>
  );
}

