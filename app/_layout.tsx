import '../global.css';
import { Marcellus_400Regular, useFonts } from '@expo-google-fonts/marcellus';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { setCardVectorStorage } from '../src/ai/card-index';
import { bootGemma } from '../src/ai/gemma-boot';
import { gemmaSession } from '../src/ai/gemma-session';
import { storage } from '../src/store/storage';
import { useAiStatus } from '../src/ui/status';
import { useDevDriver } from '../src/ui/dev/driver';

// Card vectors are kept on the phone so a later launch embeds only new or changed cards.
setCardVectorStorage(storage);

export default function RootLayout() {
  // Marcellus only sets calm titles; a failed load must never block an urgent screen.
  const [loaded, error] = useFonts({ Marcellus_400Regular });
  useDevDriver();
  useEffect(() => {
    if (!bootGemma()) return;
    const { setOn } = useAiStatus.getState();
    gemmaSession().then(
      () => setOn(true),
      () => setOn(false),
    );
  }, []);
  if (!loaded && !error) return null;
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen
          name="period"
          options={{ presentation: 'modal', animation: 'default' }}
        />
        <Stack.Screen
          name="profile-edit"
          options={{ presentation: 'modal', animation: 'default' }}
        />
        <Stack.Screen
          name="log-day"
          options={{ presentation: 'modal', animation: 'default' }}
        />
        <Stack.Screen name="day" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen name="avatar" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen name="voice" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen name="history" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen name="sources" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen name="live" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
    </>
  );
}
