import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { en } from '../src/content/copy';
import type { PeriodRecord } from '../src/core/types';
import { useLogStore } from '../src/store/log';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { confirm, tap } from '../src/ui/haptics';
import { Icon } from '../src/ui/Icon';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { EDGE, SURFACE } from '../src/ui/theme';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
type Flow = 'light' | 'medium' | 'heavy';
const FLOWS: Flow[] = ['light', 'medium', 'heavy'];
const MAX_DAYS = 14;

function DayStepper({ label, value, max, onChange }: { label: string; value: string; max?: string; onChange: (d: string) => void }) {
  const move = (n: number) => {
    const next = ymd(addDays(parseISO(value), n));
    if (max && next > max) return;
    tap();
    onChange(next);
  };
  return (
    <View className={`${SURFACE.surface} ${EDGE} rounded-pane px-xs py-xs flex-row items-center justify-between`}>
      <PressableSurface label={en('cal.period.prev_day')} onPress={() => move(-1)} surfaceClassName="min-h-tap min-w-tap items-center justify-center">
        <Icon name="chevronLeft" tone="tint" />
      </PressableSurface>
      <View className="items-center">
        <Text variant="caption1" tone="secondary">
          {label}
        </Text>
        <Text variant="headline" accessibilityLabel={`${label}, ${format(parseISO(value), 'MMMM d, yyyy')}`}>
          {format(parseISO(value), 'EEE, MMM d')}
        </Text>
      </View>
      <PressableSurface label={en('cal.period.next_day')} onPress={() => move(1)} surfaceClassName="min-h-tap min-w-tap items-center justify-center">
        <Icon name="chevronRight" tone="tint" />
      </PressableSurface>
    </View>
  );
}

export default function PeriodSheet() {
  const router = useRouter();
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const today = ymd(new Date());
  const existing = id ? useLogStore.getState().periods.find((p) => p.id === id) : undefined;
  const [start, setStart] = useState(existing?.start ?? (date && date <= today ? date : today));
  const [end, setEnd] = useState<string | null>(existing?.end ?? null);
  const [flow, setFlow] = useState<Flow>(
    () => (Object.values(existing?.flow_by_day ?? {}).find((f) => f === 'light' || f === 'medium' || f === 'heavy') as Flow | undefined) ?? 'medium',
  );

  const invalid = end !== null && end < start;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const save = () => {
    if (invalid) return;
    const last = end ?? start;
    const span = Math.min(differenceInCalendarDays(parseISO(last), parseISO(start)), MAX_DAYS - 1);
    const flow_by_day: PeriodRecord['flow_by_day'] = {};
    for (let i = 0; i <= span; i++) flow_by_day[ymd(addDays(parseISO(start), i))] = flow;
    const record: PeriodRecord = {
      id: existing?.id ?? `cal-${start}`,
      start,
      end,
      flow_by_day,
      source: existing?.source ?? 'calendar',
    };
    const rest = useLogStore.getState().periods.filter((p) => p.id !== record.id && p.start !== start);
    useLogStore.getState().setPeriods([...rest, record]);
    confirm();
    close();
  };

  return (
    <Screen raised topInset={false}>
      <View className="gap-lg pt-xl pb-xl">
        <Text variant="title1" accessibilityRole="header">
          {en(existing ? 'cal.period.edit_title' : 'cal.period.title')}
        </Text>

        <DayStepper label={en('cal.period.start')} value={start} max={today} onChange={setStart} />

        {end === null ? (
          <CapsuleButton variant="neutral" label={en('cal.period.add_end')} onPress={() => setEnd(start)} />
        ) : (
          <View className="gap-xs">
            <DayStepper label={en('cal.period.end')} value={end} max={today} onChange={setEnd} />
            {invalid ? (
              <Text variant="footnote" tone="urgent">
                {en('cal.period.end_before')}
              </Text>
            ) : null}
            <CapsuleButton variant="plain" label={en('cal.period.remove_end')} onPress={() => setEnd(null)} />
          </View>
        )}

        <View className="gap-xs">
          <Text variant="headline">{en('cal.period.flow')}</Text>
          <View className="flex-row gap-xs">
            {FLOWS.map((f) => (
              <PressableSurface
                key={f}
                label={en(`cal.flow.${f}`)}
                role="radio"
                selected={flow === f}
                onPress={() => {
                  tap();
                  setFlow(f);
                }}
                className="flex-1"
                surfaceClassName={`min-h-capsule items-center justify-center rounded-capsule ${
                  flow === f ? SURFACE.tintFill : `${SURFACE.surface} ${EDGE}`
                }`}
              >
                <Text variant="headline" tone={flow === f ? 'onTint' : 'label'}>
                  {en(`cal.flow.${f}`)}
                </Text>
              </PressableSurface>
            ))}
          </View>
        </View>

        <View className="gap-xs">
          <CapsuleButton label={en('cal.period.save')} disabled={invalid} onPress={save} />
          <CapsuleButton variant="plain" label={en('cal.period.cancel')} onPress={close} />
        </View>
      </View>
    </Screen>
  );
}
