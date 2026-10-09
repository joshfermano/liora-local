import '../global.css';
import { Marcellus_400Regular, useFonts } from '@expo-google-fonts/marcellus';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { bootGemma } from '../src/ai/gemma-boot';
import { gemmaSession } from '../src/ai/gemma-session';
import { useAiStatus } from '../src/ui/status';

export default function RootLayout() {
  // Marcellus only sets calm titles; a failed load must never block an urgent screen.
  const [loaded, error] = useFonts({ Marcellus_400Regular });
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
          options={{ presentation: 'formSheet', animation: 'default', sheetGrabberVisible: true, sheetAllowedDetents: [0.7, 1] }}
        />
        <Stack.Screen
          name="profile-edit"
          options={{ presentation: 'formSheet', animation: 'default', sheetGrabberVisible: true, sheetAllowedDetents: [0.85, 1] }}
        />
        <Stack.Screen
          name="log-day"
          options={{ presentation: 'formSheet', animation: 'default', sheetGrabberVisible: true, sheetAllowedDetents: [0.7, 1] }}
        />
      </Stack>
    </>
  );
}
