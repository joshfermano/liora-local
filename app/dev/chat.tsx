import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { runDevCommand, SEEDS, type DevCommand } from '../../src/ui/dev/driver';

// Development only: the same commands as the test driver, from a link
// (`tellliora://dev/chat?seed=cycler&say=…`). iOS asks before opening a link, so tests use the driver.
export default function DevChat() {
  const router = useRouter();
  const { say, seed, reset } = useLocalSearchParams<{ say?: string; seed?: string; reset?: string }>();

  useEffect(() => {
    if (!__DEV__) return;
    router.replace('/(tabs)/liora');
    const known = seed && seed in SEEDS ? (seed as DevCommand['seed']) : undefined;
    void runDevCommand({ seed: known, reset: Boolean(reset), say });
  }, [say, seed, reset, router]);

  return __DEV__ ? null : <Redirect href="/" />;
}
