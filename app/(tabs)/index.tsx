import { format } from 'date-fns';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { en } from '../../src/content/copy';
import { today } from '../../src/core/today';
import { useLogStore } from '../../src/store/log';
import { useProfile } from '../../src/store/profile';
import { Icon } from '../../src/ui/Icon';
import { Screen } from '../../src/ui/Screen';
import { useAiStatus } from '../../src/ui/status';
import { Text } from '../../src/ui/Text';
import { Deeper, Rows, Stats } from '../../src/ui/today/cycles';
import { GapQuestion, Glance } from '../../src/ui/today/glance';
import { Actions, AnswerBlock, Header, Rise, Strip } from '../../src/ui/today/parts';

export default function Home() {
  const entries = useLogStore((s) => s.entries);
  const moods = useLogStore((s) => s.moods);
  const periods = useLogStore((s) => s.periods);
  const cycleSettings = useLogStore((s) => s.cycleSettings);
  const dayLogs = useLogStore((s) => s.dayLogs);
  const setupDone = useLogStore((s) => s.setup?.status != null);
  const aiOn = useAiStatus((s) => s.on);
  const profile = useProfile();
  const day = format(new Date(), 'yyyy-MM-dd');

  const model = useMemo(
    () => today({ entries, moodChecks: moods, periods, cycleSettings, dayLogs, status: profile.status, today: day }),
    [entries, moods, periods, cycleSettings, dayLogs, profile.status, day],
  );
  const initial = (profile.name?.trim()[0] ?? 'L').toUpperCase();

  return (
    <Screen tabBar>
      <View className={`gap-xl ${Platform.OS === 'web' ? 'pt-[72px]' : 'pt-lg'}`}>
        <Rise order={0}>
          <View className="gap-md">
            <Header initial={initial} />
            <Strip strip={model.strip} />
          </View>
          <AnswerBlock answer={model.answer} />
        </Rise>
        <Rise order={1}>
          <Actions logged={model.loggedToday} />
          {model.gapQuestion ? <GapQuestion gap={model.gapQuestion} /> : null}
          <Glance model={model} pregnant={profile.status === 'pregnant'} />
        </Rise>
        <Rise order={2}>
          {model.cycles ? (
            <View className="gap-sm">
              <Text variant="footnote" tone="secondary" accessibilityRole="header" className="px-md">
                {en('td.cycles')}
              </Text>
              <Stats cycles={model.cycles} />
              {model.rows.length ? <Rows rows={model.rows} /> : null}
            </View>
          ) : null}
          <Deeper model={model} />
          <View className="gap-xs">
            <StatusRow icon="lock">{en('home.privacy')}</StatusRow>
            {aiOn ? (
              <StatusRow icon="info">{en('home.ai.on')}</StatusRow>
            ) : (
              <Link href="/checklist" asChild>
                <Pressable accessibilityRole="link" accessibilityHint={en('home.checklist.hint')}>
                  <StatusRow icon="info">{en('home.ai.off')}</StatusRow>
                </Pressable>
              </Link>
            )}
          </View>
        </Rise>
        {setupDone ? null : (
          <Link href="/setup" className="self-start">
            <Text variant="footnote" tone="secondary">
              {en('home.setup')}
            </Text>
          </Link>
        )}
        {/* Test builds set EXPO_PUBLIC_SHOW_DEV=1 for on-phone measurements; the demo build leaves it off. */}
        {Platform.OS === 'web' || process.env.EXPO_PUBLIC_SHOW_DEV !== '1' ? null : (
          <Link href="/dev/native" className="self-start">
            <Text variant="footnote" tone="secondary">
              {en('home.dev_native')}
            </Text>
          </Link>
        )}
      </View>
    </Screen>
  );
}

function StatusRow({ icon, children }: { icon: 'lock' | 'info'; children: string }) {
  return (
    <View className="flex-row items-center gap-xs">
      <Icon name={icon} tone="secondary" size={16} />
      <Text variant="footnote" tone="secondary">
        {children}
      </Text>
    </View>
  );
}
