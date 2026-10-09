import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { en } from '../content/copy';
import { useLogStore } from '../store/log';

// In memory only: the phone forgets it when the app closes.
interface Session {
  unlocked: boolean;
  available: boolean | null;
}
const useSession = create<Session>(() => ({ unlocked: false, available: Platform.OS === 'web' ? false : null }));

async function probe(): Promise<void> {
  if (useSession.getState().available !== null) return;
  let ok = false;
  try {
    ok = await LocalAuthentication.hasHardwareAsync();
  } catch {
    ok = false;
  }
  useSession.setState({ available: ok });
}

export async function authenticate(): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: en('lock.prompt'),
      fallbackLabel: en('lock.fallback'),
    });
    return r.success;
  } catch {
    return false;
  }
}

export function useUnlock(): {
  available: boolean;
  enabled: boolean;
  locked: boolean;
  unlock: () => Promise<boolean>;
} {
  const available = useSession((s) => s.available);
  const unlocked = useSession((s) => s.unlocked);
  const enabled = useLogStore((s) => s.setup?.lockPrivate === true);
  useEffect(() => {
    void probe();
  }, []);
  const unlock = async () => {
    const ok = await authenticate();
    if (ok) useSession.setState({ unlocked: true });
    return ok;
  };
  return { available: available === true, enabled, locked: enabled && available !== false && !unlocked, unlock };
}
