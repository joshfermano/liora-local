import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { en } from '../src/content/copy';
import { useLogStore } from '../src/store/log';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { ChoiceCard } from '../src/ui/ChoiceCard';
import { Lattice } from '../src/ui/Lattice';
import { authenticate, useUnlock } from '../src/ui/lock';
import { cleanName, mergeSetup } from '../src/ui/name';
import { NameField } from '../src/ui/NameField';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

export default function Settings() {
  const router = useRouter();
  const saved = useLogStore((s) => (typeof s.setup?.name === 'string' ? s.setup.name : ''));
  const { available, enabled } = useUnlock();
  const [name, setName] = useState(() => cleanName(saved));
  const [confirming, setConfirming] = useState(false);
  const dirty = cleanName(name) !== cleanName(saved);

  const toggleLock = async () => {
    if (enabled) return mergeSetup({ lockPrivate: false });
    if (await authenticate()) mergeSetup({ lockPrivate: true });
  };

  return (
    <Screen>
      <View className="gap-xl pt-xl">
        <Text variant="displayHeading" accessibilityRole="header">
          {en('settings.title')}
        </Text>
        <NameField value={name} onChange={setName} onSubmit={() => mergeSetup({ name: cleanName(name) || undefined })} />
        {dirty ? <CapsuleButton variant="tinted" label={en('settings.name.save')} onPress={() => mergeSetup({ name: cleanName(name) || undefined })} /> : null}
        {available ? <ChoiceCard label={en('settings.lock')} chosen={enabled} onPress={() => void toggleLock()} /> : null}
        {confirming ? (
          <Lattice>
            <View className="px-md py-sm gap-sm">
              <Text variant="body">{en('log.delete_all.confirm')}</Text>
              <CapsuleButton
                variant="neutral"
                label={en('log.delete_all')}
                onPress={() => {
                  void useLogStore.getState().deleteEverything();
                  setName('');
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
