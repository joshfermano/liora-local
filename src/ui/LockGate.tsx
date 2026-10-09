import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { en } from '../content/copy';
import { CapsuleButton } from './CapsuleButton';
import { Icon } from './Icon';
import { useUnlock } from './lock';
import { Screen } from './Screen';
import { Text } from './Text';

// Only /log, /mood, /calendar and /history use this. Help paths must never be gated.
export function LockGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { locked, unlock } = useUnlock();
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
        <CapsuleButton variant="plain" label={en('result.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    </Screen>
  );
}
