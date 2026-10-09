import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { en } from '../../src/content/copy';
import { useLogStore } from '../../src/store/log';
import { useProfile } from '../../src/store/profile';
import { CapsuleButton } from '../../src/ui/CapsuleButton';
import { confirm, tap } from '../../src/ui/haptics';
import { authenticate, useUnlock } from '../../src/ui/lock';
import { mergeSetup } from '../../src/ui/name';
import { Divider, NumberRow, Row, Section, ValueRow } from '../../src/ui/profile/parts';
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
  const settings = useLogStore((s) => s.cycleSettings);
  const { available, enabled } = useUnlock();
  const aiOn = useAiStatus((s) => s.on);
  const [confirming, setConfirming] = useState(false);
  const openEditor = () => {
    tap();
    router.push('/profile-edit');
  };
  const setCycle = (patch: { stated_cycle_length?: number; stated_period_length?: number }) =>
    useLogStore.getState().setCycleSettings({ ...settings, ...patch });

  const toggleLock = async () => {
    tap();
    if (enabled) return mergeSetup({ lockPrivate: false });
    if (await authenticate()) mergeSetup({ lockPrivate: true });
  };

  return (
    <Screen>
      <View className="gap-xl pb-xl pt-md">
        <View className="items-center gap-sm">
          <LinearGradient
            colors={[colors['tint-fill'], colors['light-dawn-source']]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text variant="displayTitle" tone="onTint" accessibilityElementsHidden>
              {(profile.name ?? 'L').charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <Text variant="displayTitle" accessibilityRole="header">
            {profile.name ?? en('tabs.profile')}
          </Text>
        </View>

        <Section title={en('profile.about')}>
          <ValueRow label={en('profile.name')} value={profile.name} onPress={openEditor} />
          <Divider />
          <ValueRow label={en('profile.age')} value={profile.age} unit={en('profile.unit.years')} onPress={openEditor} />
          <Divider />
          <ValueRow label={en('profile.edit.height')} value={profile.heightCm} unit={en('profile.unit.cm')} onPress={openEditor} />
          <Divider />
          <ValueRow label={en('profile.edit.weight')} value={profile.weightKg} unit={en('profile.unit.kg')} onPress={openEditor} />
          <Divider />
          <ValueRow label={en('profile.edit.status')} value={profile.status ? en(`setup.status.${profile.status}`) : undefined} onPress={openEditor} />
          {profile.status === 'pregnant' ? (
            <>
              <Divider />
              <ValueRow label={en('setup.weeks')} value={profile.weeks} unit={en('profile.unit.weeks')} onPress={openEditor} />
            </>
          ) : null}
        </Section>

        <Section title={en('profile.cycle')}>
          <NumberRow label={en('setup.cycle_length')} value={settings.stated_cycle_length} range={[15, 90]} onSave={(n) => setCycle({ stated_cycle_length: n })} />
          <Divider />
          <NumberRow label={en('profile.period_length')} value={settings.stated_period_length} range={[1, 14]} onSave={(n) => setCycle({ stated_period_length: n })} />
        </Section>

        <Section title={en('profile.privacy')}>
          <Row label={en('home.privacy')}>
            <Symbol name="lock.fill" fallback="lock" tone="tint" />
          </Row>
          {available ? (
            <>
              <Divider />
              <Row label={en('settings.lock')}>
                <Switch value={enabled} onValueChange={() => void toggleLock()} trackColor={{ true: colors['tint-fill'] }} accessibilityLabel={en('settings.lock')} />
              </Row>
            </>
          ) : null}
        </Section>

        <Section title={en('profile.ai')}>
          <PressableSurface label={en('profile.ai.open')} onPress={() => router.push('/setup')} role="link" surfaceClassName="min-h-choice flex-row items-center justify-between gap-md px-md">
            <View className="flex-1">
              <Text variant="body">{aiOn ? en('home.ai.on') : en('home.ai.off')}</Text>
              <Text variant="footnote" tone="secondary">
                {en('profile.ai.open')}
              </Text>
            </View>
            <Symbol name="chevron.right" fallback="chevronRight" tone="tertiary" size={16} />
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
          <Section title="">
            <PressableSurface label={en('log.delete_all')} onPress={() => setConfirming(true)} pressScale={0.98} surfaceClassName="min-h-choice justify-center px-md">
              <Text variant="body" tone="urgent">
                {en('log.delete_all')}
              </Text>
            </PressableSurface>
          </Section>
        )}
      </View>
    </Screen>
  );
}
