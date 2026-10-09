import { format, parseISO } from 'date-fns';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { en } from '../src/content/copy';
import { applyFlow } from '../src/core/daylog';
import type { Activity, DayLog, Flow, Mood, Symptom } from '../src/core/types';
import { ACTIVITIES, MOODS, SYMPTOMS } from '../src/core/vocabulary';
import { useLogStore } from '../src/store/log';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { ChipSection } from '../src/ui/daylog/ChipGrid';
import { confirm } from '../src/ui/haptics';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { EDGE, SURFACE, TEXT_TONE, useColors } from '../src/ui/theme';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
type FlowChoice = 'none' | 'light' | 'medium' | 'heavy';
const FLOW_CHOICES: FlowChoice[] = ['none', 'light', 'medium', 'heavy'];

function saved(date: string): DayLog {
  const s = useLogStore.getState();
  const log = s.dayLogs.find((l) => l.date === date);
  if (log) return log;
  const p = s.periods.find((x) => date in x.flow_by_day);
  return { date, flow: p?.flow_by_day[date] ?? null, symptoms: [], moods: [], activities: [] };
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function LogDaySheet() {
  const router = useRouter();
  const colors = useColors();
  const { date: param } = useLocalSearchParams<{ date?: string }>();
  const today = ymd(new Date());
  const first = param && /^\d{4}-\d{2}-\d{2}$/.test(param) && param <= today ? param : today;
  const [date, setDate] = useState(first);
  const [log, setLog] = useState<DayLog>(() => saved(first));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const pickDate = (d: Date) => {
    const next = ymd(d);
    setDate(next);
    setLog(saved(next));
  };
  const flowChoice: FlowChoice = log.flow === 'spotting' || log.flow === null ? 'none' : log.flow;

  const save = () => {
    const s = useLogStore.getState();
    const flow: Flow | null = flowChoice === 'none' ? null : flowChoice;
    const note = log.note?.trim();
    s.saveDayLog({ ...log, date, flow, note: note || undefined }, applyFlow(s.periods, date, flow));
    confirm();
    close();
  };
  const clear = () => {
    const s = useLogStore.getState();
    s.deleteDayLog(date);
    s.setPeriods(applyFlow(s.periods, date, null));
    close();
  };

  return (
    <Screen raised topInset={false}>
      <View className="gap-lg pt-xl pb-xl">
        <Text variant="title1" accessibilityRole="header">
          {en('daylog.title')}
        </Text>

        <View className="flex-row items-center justify-between">
          <Text variant="headline">{en('daylog.date')}</Text>
          <DateTimePicker
            value={parseISO(date)}
            mode="date"
            display="compact"
            maximumDate={new Date()}
            onValueChange={(_, d) => pickDate(d)}
          />
        </View>

        <ChipSection<FlowChoice>
          title={en('daylog.period')}
          single
          options={FLOW_CHOICES.map((id) => ({
            id,
            label: en(id === 'none' ? 'daylog.flow.none' : `cal.flow.${id}`),
          }))}
          chosen={[flowChoice]}
          onToggle={(id) => setLog({ ...log, flow: id === 'none' ? null : id })}
        />

        <ChipSection<Symptom>
          title={en('daylog.symptoms')}
          options={SYMPTOMS.map((id) => ({ id, label: en(`symptom.${id}`) }))}
          chosen={log.symptoms}
          onToggle={(id) => setLog({ ...log, symptoms: toggle(log.symptoms, id) })}
        />

        <ChipSection<Mood>
          title={en('daylog.moods')}
          options={MOODS.map((id) => ({ id, label: en(`feeling.${id}`) }))}
          chosen={log.moods}
          onToggle={(id) => setLog({ ...log, moods: toggle(log.moods, id) })}
        />

        <ChipSection<Activity>
          title={en('daylog.activities')}
          options={ACTIVITIES.map((id) => ({ id, label: en(`activity.${id}`) }))}
          chosen={log.activities}
          onToggle={(id) => setLog({ ...log, activities: toggle(log.activities, id) })}
        />

        <View className="gap-xs">
          <Text variant="headline" accessibilityRole="header">
            {en('daylog.note')}
          </Text>
          <View className={`${SURFACE.surface} ${EDGE} rounded-pane`}>
            <TextInput
              multiline
              value={log.note ?? ''}
              onChangeText={(note) => setLog({ ...log, note })}
              accessibilityLabel={en('daylog.note.label')}
              textAlignVertical="top"
              cursorColor={colors.tint}
              selectionColor={colors.tint}
              className={`min-h-field p-md text-body ${TEXT_TONE.label}`}
              style={{ outlineStyle: 'none' } as object}
            />
          </View>
        </View>

        <View className="gap-xs">
          <CapsuleButton label={en('daylog.save')} onPress={save} />
          <CapsuleButton variant="neutral" label={en('daylog.clear')} onPress={clear} />
          <CapsuleButton variant="plain" label={en('daylog.cancel')} onPress={close} />
        </View>
      </View>
    </Screen>
  );
}
