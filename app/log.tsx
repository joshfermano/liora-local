import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { en } from '../src/content/copy';
import type { Entry } from '../src/core/types';
import { useLogStore } from '../src/store/log';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { EntryRow } from '../src/ui/EntryRow';
import { Icon } from '../src/ui/Icon';
import { LockGate } from '../src/ui/LockGate';
import { Lattice } from '../src/ui/Lattice';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

const GROUPS = ['period', 'symptoms', 'mood', 'pregnancy'] as const;
type Group = (typeof GROUPS)[number];

function groupOf(e: Entry): Group {
  if (e.extraction?.period) return 'period';
  if (e.findings.length > 0 || (e.extraction?.symptoms.length ?? 0) > 0) return 'symptoms';
  if ((e.extraction?.moods.length ?? 0) > 0) return 'mood';
  if (e.extraction?.pregnancy_weeks != null) return 'pregnancy';
  return 'symptoms';
}

export default function LogRoute() {
  return (
    <LockGate>
      <Log />
    </LockGate>
  );
}

function Log() {
  const router = useRouter();
  const entries = useLogStore((s) => s.entries);
  const deleteEntry = useLogStore((s) => s.deleteEntry);
  const [confirming, setConfirming] = useState(false);
  const grouped = useMemo(() => {
    const by: Record<Group, Entry[]> = { period: [], symptoms: [], mood: [], pregnancy: [] };
    for (const e of entries) by[groupOf(e)].push(e);
    return by;
  }, [entries]);

  return (
    <Screen>
      <View className="gap-xl pt-xl">
        <Text variant="displayHeading" accessibilityRole="header">
          {en('log.title')}
        </Text>
        <View className="flex-row items-center gap-xs">
          <Icon name="lock" tone="secondary" size={16} />
          <Text variant="footnote" tone="secondary">
            {en('log.privacy')}
          </Text>
        </View>
        {entries.length === 0 ? (
          <Text variant="body" tone="secondary">
            {en('log.empty')}
          </Text>
        ) : (
          GROUPS.filter((g) => grouped[g].length > 0).map((g) => (
            <Lattice key={g} header={en(`log.group.${g}`)}>
              {grouped[g].map((e) => (
                <View key={e.id} className="flex-row items-start px-md py-sm gap-xs">
                  <EntryRow entry={e} />
                  <PressableSurface
                    label={en('log.delete_entry')}
                    onPress={() => deleteEntry(e.id)}
                    surfaceClassName="min-h-tap min-w-tap items-center justify-center"
                  >
                    <Icon name="close" tone="secondary" />
                  </PressableSurface>
                </View>
              ))}
            </Lattice>
          ))
        )}
        {confirming ? (
          <Lattice>
            <View className="px-md py-sm gap-sm">
              <Text variant="body">{en('log.delete_all.confirm')}</Text>
              <CapsuleButton
                variant="neutral"
                label={en('log.delete_all')}
                onPress={() => {
                  void useLogStore.getState().deleteEverything();
                  setConfirming(false);
                }}
              />
              <CapsuleButton variant="plain" label={en('log.cancel')} onPress={() => setConfirming(false)} />
            </View>
          </Lattice>
        ) : (
          <Lattice>
            <PressableSurface
              label={en('log.delete_all')}
              onPress={() => setConfirming(true)}
              pressScale={0.98}
              surfaceClassName="px-md min-h-tap justify-center"
            >
              <Text variant="body" tone="urgent">
                {en('log.delete_all')}
              </Text>
            </PressableSurface>
          </Lattice>
        )}
        <CapsuleButton
          variant="neutral"
          label={en('result.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </View>
    </Screen>
  );
}
