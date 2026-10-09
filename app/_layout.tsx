import '../global.css';
import { Marcellus_400Regular, useFonts } from '@expo-google-fonts/marcellus';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  // Marcellus only sets calm titles; a failed load must never block an urgent screen.
  const [loaded, error] = useFonts({ Marcellus_400Regular });
  if (!loaded && !error) return null;
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </>
  );
}
