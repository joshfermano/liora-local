import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { en } from '../../src/content/copy';
import { today } from '../../src/core/today';
import { useLogStore } from '../../src/store/log';
import { useProfile } from '../../src/store/profile';
import { CapsuleButton } from '../../src/ui/CapsuleButton';
import { confirm, tap } from '../../src/ui/haptics';
import { authenticate, useUnlock } from '../../src/ui/lock';
import { mergeSetup } from '../../src/ui/name';
import { Header, seasonOf } from '../../src/ui/profile/Header';
import { MemorySection } from '../../src/ui/profile/Memory';
import { Divider, Fade, Row, Section, ValueRow } from '../../src/ui/profile/parts';
import { PressableSurface } from '../../src/ui/PressableSurface';
import { Screen } from '../../src/ui/Screen';
import { useAiStatus } from '../../src/ui/status';
import { Symbol } from '../../src/ui/Symbol';
import { Text } from '../../src/ui/Text';
import { useColors } from '../../src/ui/theme';

export default function Profile() {
  const router = useRouter();
  const colors = useColors();
  const profile = useProfile();
  const entries = useLogStore((s) => s.entries);
  const moods = useLogStore((s) => s.moods);
  const periods = useLogStore((s) => s.periods);
  const settings = useLogStore((s) => s.cycleSettings);
  const dayLogs = useLogStore((s) => s.dayLogs);
  const { available, enabled } = useUnlock();
  const aiOn = useAiStatus((s) => s.on);
  const voiceName = useLogStore((s) => (typeof s.setup?.voice === 'string' && typeof s.setup.voiceName === 'string' ? s.setup.voiceName : undefined));
  const [confirming, setConfirming] = useState(false);
  const day = format(new Date(), 'yyyy-MM-dd');

  const model = useMemo(
    () => today({ entries, moodChecks: moods, periods, cycleSettings: settings, dayLogs, status: profile.status, weeks: profile.weeks, today: day }),
    [entries, moods, periods, settings, dayLogs, profile.status, profile.weeks, day],
  );
  const { season, line } = seasonOf(profile, model, settings.stated_cycle_length);
  const pregnant = profile.status === 'pregnant';

  const openEditor = () => {
    tap();
    router.push('/profile-edit');
  };
  const toggleLock = async () => {
    tap();
    if (enabled) return mergeSetup({ lockPrivate: false });
    if (await authenticate()) mergeSetup({ lockPrivate: true });
  };

  return (
    <Screen tabBar>
      <View className={`gap-xl pb-xl ${Platform.OS === 'web' ? 'pt-[72px]' : 'pt-lg'}`}>
        <Fade order={0}>
          <Header
            profile={profile}
            season={season}
            line={line}
            onAvatar={() => {
              tap();
              router.push('/avatar');
            }}
            onEdit={openEditor}
          />
        </Fade>

        <Fade order={1}>
          {pregnant ? null : (
            <Section title={en('pf.cycle')}>
              <ValueRow label={en('pf.cycle_length')} value={model.cycles?.length?.average ?? settings.stated_cycle_length} unit={en('profile.unit.days')} />
              <Divider />
              <ValueRow label={en('profile.period_length')} value={model.cycles?.period?.average ?? settings.stated_period_length} unit={en('profile.unit.days')} />
              <Divider />
              <ValueRow label={en('pf.cycles_logged')} value={model.cyclesLogged} />
            </Section>
          )}
          <Section title={en('profile.about')} footer={en('pf.about_footer')}>
            <ValueRow label={en('profile.age')} value={profile.age} unit={en('profile.unit.years')} onPress={openEditor} />
            <Divider />
            <ValueRow label={en('profile.edit.height')} value={profile.heightCm} unit={en('profile.unit.cm')} onPress={openEditor} />
            <Divider />
            <ValueRow label={en('profile.edit.weight')} value={profile.weightKg} unit={en('profile.unit.kg')} onPress={openEditor} />
          </Section>
          <MemorySection />
        </Fade>

        <Fade order={2}>
          <Section title={en('profile.privacy')}>
            {available ? (
              <>
                <Row label={en('settings.lock')}>
                  <Switch value={enabled} onValueChange={() => void toggleLock()} trackColor={{ true: colors['tint-fill'] }} accessibilityLabel={en('settings.lock')} />
                </Row>
                <Divider />
              </>
            ) : null}
            <Row label={en('home.privacy')}>
              <Symbol name="lock.fill" fallback="lock" tone="tint" />
            </Row>
          </Section>

          <Section title={en('profile.ai')}>
            <PressableSurface label={`${en('profile.ai')}, ${aiOn ? en('pf.ai.on') : en('pf.ai.off')}. ${en('profile.ai.open')}`} onPress={() => router.push('/setup')} role="link" pressScale={0.98} surfaceClassName="min-h-choice flex-row items-center justify-between gap-md px-md">
              <Text variant="body">{en('profile.ai.open')}</Text>
              <View className="flex-row items-center gap-xs">
                <Text variant="body" tone="secondary">
                  {aiOn ? en('pf.ai.on') : en('pf.ai.off')}
                </Text>
                <Symbol name="chevron.right" fallback="chevronRight" tone="tertiary" size={14} />
              </View>
            </PressableSurface>
            <Divider />
            <PressableSurface label={`${en('voice.title')}, ${voiceName ?? en('voice.auto')}`} onPress={() => router.push('/voice')} role="link" pressScale={0.98} surfaceClassName="min-h-choice flex-row items-center justify-between gap-md px-md">
              <Text variant="body">{en('voice.title')}</Text>
              <View className="flex-row items-center gap-xs">
                <Text variant="body" tone="secondary">
                  {voiceName ?? en('voice.auto')}
                </Text>
                <Symbol name="chevron.right" fallback="chevronRight" tone="tertiary" size={14} />
              </View>
            </PressableSurface>
          </Section>

          {confirming ? (
            <Section title={en('log.delete_all')}>
              <View className="gap-sm p-md">
                <Text variant="body">{en('log.delete_all.confirm')}</Text>
                <CapsuleButton
                  variant="neutral"
                  label={en('log.delete_all')}
                  onPress={() => {
                    confirm();
                    void useLogStore.getState().deleteEverything();
                    setConfirming(false);
                  }}
                />
                <CapsuleButton variant="plain" label={en('log.cancel')} onPress={() => setConfirming(false)} />
              </View>
            </Section>
          ) : (
            <Section>
              <PressableSurface label={en('log.delete_all')} onPress={() => setConfirming(true)} pressScale={0.98} surfaceClassName="min-h-choice justify-center px-md">
                <Text variant="body" tone="urgent">
                  {en('log.delete_all')}
                </Text>
              </PressableSurface>
            </Section>
          )}
        </Fade>
      </View>
    </Screen>
  );
}
