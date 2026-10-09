import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { VoiceInfo } from './voice';

type SpeechModule = typeof import('expo-speech');
// An app built before expo-speech must not take the router down with it; callers then stay silent.
export const Speech: SpeechModule | null =
  Platform.OS === 'web' || requireOptionalNativeModule('ExpoSpeech') ? (require('expo-speech') as SpeechModule) : null;

// Read once: the installed voices do not change while the app is open.
let installed: Promise<VoiceInfo[]> | null = null;
export function installedVoices(): Promise<VoiceInfo[]> {
  installed ??= (async () => {
    try {
      return (await Speech?.getAvailableVoicesAsync()) ?? [];
    } catch {
      return [];
    }
  })();
  return installed;
}
