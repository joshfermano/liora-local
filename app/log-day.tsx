import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { en } from '../src/content/copy';
import { applyFlow } from '../src/core/daylog';
import type { Activity, DayLog, Flow, Mood, Symptom } from '../src/core/types';
import { ACTIVITIES, MOODS, SYMPTOMS } from '../src/core/vocabulary';
import { useLogStore } from '../src/store/log';
import type { LogMarkName } from '../src/ui/art';
import { ChipSection } from '../src/ui/daylog/ChipGrid';
import { WeekStrip } from '../src/ui/daylog/WeekStrip';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { EDGE, SURFACE, TEXT_TONE, useColors } from '../src/ui/theme';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
type FlowChoice = 'none' | 'light' | 'medium' | 'heavy';
const FLOW_CHOICES: FlowChoice[] = ['none', 'light', 'medium', 'heavy'];

const FLOW_MARK: Record<FlowChoice, LogMarkName> = {
  none: 'flow_none',
  light: 'flow_light',
  medium: 'flow_medium',
  heavy: 'flow_heavy',
};
const ACTIVITY_MARK: Record<Activity, LogMarkName> = {
  walk: 'walk',
  exercise: 'exercise',
  rest: 'rest',
  water: 'water',
  slept_well: 'sleep_well',
  checkup_visit: 'checkup',
  medicine_taken: 'medicine',
};

function saved(date: string): DayLog {
  const s = useLogStore.getState();
  const log = s.dayLogs.find((l) => l.date === date);
  if (log) return log;
  const p = s.periods.find((x) => date in x.flow_by_day);
  return { date, flow: p?.flow_by_day[date] ?? null, symptoms: [], moods: [], activities: [] };
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function NoteField({ initial, onDraft, onSave }: { initial: string; onDraft: (note: string) => void; onSave: (note: string) => void }) {
  const colors = useColors();
  const [text, setText] = useState(initial);
  const latest = useRef(text);
  latest.current = text;
  return (
    <View className="gap-xs">
      <Text variant="headline" accessibilityRole="header">
        {en('daylog.note')}
      </Text>
      <View className={`${SURFACE.surface} ${EDGE} rounded-pane`}>
        <TextInput
          multiline
          value={text}
          onChangeText={(t) => {
            setText(t);
            onDraft(t);
          }}
          onBlur={() => onSave(latest.current)}
          accessibilityLabel={en('daylog.note.label')}
          textAlignVertical="top"
          cursorColor={colors.tint}
          selectionColor={colors.tint}
          className={`min-h-field p-md text-body ${TEXT_TONE.label}`}
          style={{ outlineStyle: 'none' } as object}
        />
      </View>
    </View>
  );
}

export default function LogDaySheet() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { date: param } = useLocalSearchParams<{ date?: string }>();
  const today = ymd(new Date());
  const first = param && /^\d{4}-\d{2}-\d{2}$/.test(param) && param <= today ? param : today;
  const [date, setDate] = useState(first);
  const [log, setLog] = useState<DayLog>(() => saved(first));
  const noteDraft = useRef<string | null>(null);
  const [rev, setRev] = useState(0);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const commit = (next: DayLog) => {
    const s = useLogStore.getState();
    const note = next.note?.trim();
    s.saveDayLog({ ...next, note: note || undefined }, applyFlow(s.periods, next.date, next.flow));
    setLog(next);
  };
  const pickDay = (d: string) => {
    noteDraft.current = null;
    setDate(d);
    setLog(saved(d));
  };
  const flowChoice: FlowChoice = log.flow === 'spotting' || log.flow === null ? 'none' : log.flow;
  const saveNote = (note: string) => {
    noteDraft.current = null;
    commit({ ...log, note });
  };
  const done = () => {
    if (noteDraft.current !== null) saveNote(noteDraft.current);
    close();
  };
  const clear = () => {
    const s = useLogStore.getState();
    s.deleteDayLog(date);
    s.setPeriods(applyFlow(s.periods, date, null));
    noteDraft.current = null;
    setLog(saved(date));
    setRev((r) => r + 1);
  };

  return (
    <Screen raised topInset={false}>
      <View className="gap-lg pt-xl pb-xl">
        <View className="gap-xxs">
          <View className="flex-row items-center justify-between">
            <Text variant="displayTitle" accessibilityRole="header" className="shrink">
              {en('daylog.title')}
            </Text>
            <PressableSurface label={en('daylog.done')} onPress={done} surfaceClassName="min-h-tap min-w-tap items-end justify-center">
              <Text variant="headline" tone="tint">
                {en('daylog.done')}
              </Text>
            </PressableSurface>
          </View>
          <Text variant="footnote" tone="secondary">
            {en('daylog.footnote')}
          </Text>
        </View>

        <WeekStrip today={today} chosen={date} onChoose={pickDay} />

        <Animated.View key={`${date}-${rev}`} entering={reduce ? undefined : FadeIn.duration(180)} className="gap-lg">
          <ChipSection<FlowChoice>
            title={en('daylog.period')}
            single
            options={FLOW_CHOICES.map((id) => ({
              id,
              mark: FLOW_MARK[id],
              label: en(id === 'none' ? 'daylog.flow.none' : `cal.flow.${id}`),
            }))}
            chosen={[flowChoice]}
            onToggle={(id) => commit({ ...log, flow: id === 'none' ? null : (id as Flow) })}
          />

          <ChipSection<Symptom>
            title={en('daylog.symptoms')}
            options={SYMPTOMS.map((id) => ({ id, mark: id, label: en(`symptom.${id}`) }))}
            chosen={log.symptoms}
            onToggle={(id) => commit({ ...log, symptoms: toggle(log.symptoms, id) })}
          />

          <ChipSection<Mood>
            title={en('daylog.moods')}
            options={MOODS.map((id) => ({ id, mark: id, label: en(`feeling.${id}`) }))}
            chosen={log.moods}
            onToggle={(id) => commit({ ...log, moods: toggle(log.moods, id) })}
          />

          <ChipSection<Activity>
            title={en('daylog.activities')}
            options={ACTIVITIES.map((id) => ({ id, mark: ACTIVITY_MARK[id], label: en(`activity.${id}`) }))}
            chosen={log.activities}
            onToggle={(id) => commit({ ...log, activities: toggle(log.activities, id) })}
          />

          <NoteField initial={log.note ?? ''} onDraft={(t) => (noteDraft.current = t)} onSave={saveNote} />
        </Animated.View>

        <PressableSurface label={en('daylog.clear')} onPress={clear} surfaceClassName="min-h-tap items-center justify-center">
          <Text variant="body" tone="secondary">
            {en('daylog.clear')}
          </Text>
        </PressableSurface>
      </View>
    </Screen>
  );
}
