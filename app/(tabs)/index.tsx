import { format } from 'date-fns';
import { Link, type Href } from 'expo-router';
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
import { EDGE, SEPARATOR, SURFACE } from '../../src/ui/theme';
import { TellBar } from '../../src/ui/today/TellBar';
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
    () => today({ entries, moodChecks: moods, periods, cycleSettings, dayLogs, status: profile.status, weeks: profile.weeks, today: day }),
    [entries, moods, periods, cycleSettings, dayLogs, profile.status, profile.weeks, day],
  );
  const initial = (profile.name?.trim()[0] ?? 'L').toUpperCase();

  return (
    <Screen tabBar>
      <View className={`gap-xl ${Platform.OS === 'web' ? 'pt-[72px]' : 'pt-lg'}`}>
        <Rise order={0}>
          <View className="gap-md">
            <Header initial={initial} avatar={profile.avatar} />
            <Strip strip={model.strip} />
          </View>
          <AnswerBlock answer={model.answer} />
        </Rise>
        <Rise order={1}>
          <Actions logged={model.loggedToday} />
          <TellBar />
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
          <Footer aiOn={aiOn} setupDone={setupDone} />
        </Rise>
      </View>
    </Screen>
  );
}

// One quiet card for how Liora runs on this phone, so the page ends tidily.
function Footer({ aiOn, setupDone }: { aiOn: boolean; setupDone: boolean }) {
  const showDev = Platform.OS !== 'web' && process.env.EXPO_PUBLIC_SHOW_DEV === '1';
  const rows: { key: string; icon: 'lock' | 'info' | 'phone'; label: string; href?: Href; hint?: string }[] = [
    { key: 'privacy', icon: 'lock', label: en('home.privacy') },
    aiOn
      ? { key: 'ai', icon: 'info', label: en('home.ai.on') }
      : { key: 'ai', icon: 'info', label: en('home.ai.off'), href: '/checklist', hint: en('home.checklist.hint') },
    ...(setupDone ? [] : [{ key: 'setup', icon: 'phone' as const, label: en('home.setup'), href: '/setup' as Href }]),
    // Test builds set EXPO_PUBLIC_SHOW_DEV=1 for on-phone measurements; the demo build leaves it off.
    ...(showDev ? [{ key: 'dev', icon: 'info' as const, label: en('home.dev_native'), href: '/dev/native' as Href }] : []),
  ];
  return (
    <View className={`${SURFACE.surface} ${EDGE} overflow-hidden rounded-pane`}>
      {rows.map((r, i) => {
        const body = (
          <View className="min-h-tap flex-row items-center gap-sm px-md py-sm">
            <Icon name={r.icon} tone="secondary" size={18} />
            <Text variant="subheadline" tone={r.href ? 'label' : 'secondary'} className="flex-1">
              {r.label}
            </Text>
            {r.href ? <Icon name="chevronRight" tone="tertiary" size={16} /> : null}
          </View>
        );
        return (
          <View key={r.key}>
            {i > 0 ? <View className={`ml-[46px] h-px ${SEPARATOR}`} /> : null}
            {r.href ? (
              <Link href={r.href} asChild>
                <Pressable accessibilityRole="link" accessibilityHint={r.hint}>
                  {body}
                </Pressable>
              </Link>
            ) : (
              body
            )}
          </View>
        );
      })}
    </View>
  );
}
