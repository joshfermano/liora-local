import { format, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { en } from '../src/content/copy';
import { describeDay } from '../src/core/calendar';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { fill, ymd, useCalendarInput } from '../src/ui/calendar/shared';
import { Chip } from '../src/ui/Chip';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

export default function DayPreview() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const input = useCalendarInput();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? (params.date as string) : ymd(new Date());
  const { mark, estimate, log, checkIns } = describeDay(input, date);

  const lines: string[] = [];
  if (mark.cycleDay !== null) lines.push(fill(en('cal2.preview.cycle_day'), { n: mark.cycleDay }));
  if (mark.period && mark.periodDay !== null) {
    lines.push(fill(en(mark.period === 'logged' ? 'cal2.preview.period_logged' : 'cal2.preview.period_estimated'), { n: mark.periodDay }));
  }
  if (estimate) {
    lines.push(
      fill(en('cal2.preview.window'), {
        from: format(parseISO(estimate.window.from), 'MMM d'),
        to: format(parseISO(estimate.window.to), 'MMM d'),
        confidence: en(`cal2.confidence.${estimate.confidence}`),
      }),
    );
  }

  const chips = log
    ? [
        ...(log.flow ? [en(`cal.flow.${log.flow}`)] : []),
        ...log.symptoms.map((x) => en(`symptom.${x}`)),
        ...log.moods.map((x) => en(`feeling.${x}`)),
        ...log.activities.map((x) => en(`activity.${x}`)),
      ]
    : [];
  const hasLog = chips.length > 0 || !!log?.note || checkIns > 0;

  return (
    <Screen raised topInset={false}>
      <View className="gap-lg pb-xl pt-xl">
        <Text variant="title1" accessibilityRole="header">
          {format(parseISO(date), 'EEEE, MMMM d')}
        </Text>

        {lines.length > 0 ? (
          <View className="gap-xxs">
            {lines.map((l) => (
              <Text key={l} variant="body" tone="secondary">
                {l}
              </Text>
            ))}
          </View>
        ) : null}

        <View className="gap-sm">
          <Text variant="headline">{en('cal2.preview.logged')}</Text>
          {hasLog ? (
            <>
              {chips.length > 0 ? (
                <View className="flex-row flex-wrap gap-xs">
                  {chips.map((c, i) => (
                    <Chip key={`${c}-${i}`} label={c} chosen />
                  ))}
                </View>
              ) : null}
              {log?.note ? <Text variant="body">{log.note}</Text> : null}
              {checkIns > 0 ? (
                <Text variant="subheadline" tone="secondary">
                  {checkIns === 1 ? en('cal2.preview.checkin_one') : fill(en('cal2.preview.checkins'), { n: checkIns })}
                </Text>
              ) : null}
            </>
          ) : (
            <Text variant="body" tone="secondary">
              {en('cal2.preview.nothing')}
            </Text>
          )}
        </View>

        <CapsuleButton
          label={en('cal2.log_day')}
          onPress={() => router.replace({ pathname: '/log-day', params: { date } })}
        />
      </View>
    </Screen>
  );
}
