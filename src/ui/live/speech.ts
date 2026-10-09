import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { VoiceInfo } from './voice';

type SpeechModule = typeof import('expo-speech');
// An app built before expo-speech must not take the router down with it; callers then stay silent.
export const Speech: SpeechModule | null =
  Platform.OS === 'web' || requireOptionalNativeModule('ExpoSpeech') ? (require('expo-speech') as SpeechModule) : null;

// Read once and reused; the voice picker asks again so a voice downloaded meanwhile shows up.
let installed: Promise<VoiceInfo[]> | null = null;
export function installedVoices(fresh = false): Promise<VoiceInfo[]> {
  if (fresh) installed = null;
  installed ??= (async () => {
    try {
      return (await Speech?.getAvailableVoicesAsync()) ?? [];
    } catch {
      return [];
    }
  })();
  return installed;
}
