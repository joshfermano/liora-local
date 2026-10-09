import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { en } from '../content/copy';
import { CapsuleButton } from './CapsuleButton';
import { Icon } from './Icon';
import { useRelock, useUnlock } from './lock';
import { Screen } from './Screen';
import { Text } from './Text';

// Wraps the tabs (Today, Calendar, Liora, Profile) and the private screens. Help is never gated:
// the lock screen opens the danger-sign checklist without Face ID.
// Only the outermost gate (the tabs) listens for the app going to the background.
export function LockGate({ children, root = false }: { children: ReactNode; root?: boolean }) {
  const router = useRouter();
  const { locked, unlock } = useUnlock();
  useRelock(unlock, root);
  useEffect(() => {
    if (locked) void unlock();
    // Ask once when the screen opens; the button asks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!locked) return <>{children}</>;
  return (
    <Screen>
      <View className="gap-lg pt-xxl items-start">
        <Icon name="lock" tone="secondary" size={24} />
        <Text variant="title1" accessibilityRole="header">
          {en('lock.title')}
        </Text>
        <Text variant="body" tone="secondary">
          {en('lock.body')}
        </Text>
        <CapsuleButton label={en('lock.button')} onPress={() => void unlock()} />
        <CapsuleButton variant="plain" label={en('lock.help')} onPress={() => router.push('/checklist')} />
        {router.canGoBack() ? <CapsuleButton variant="plain" label={en('result.back')} onPress={() => router.back()} /> : null}
      </View>
    </Screen>
  );
}
