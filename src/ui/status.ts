import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';

// The AI state is set by whoever loads the model; until then the honest default is "off".
export const useAiStatus = create<{ on: boolean; setOn(on: boolean): void }>((set) => ({
  on: false,
  setOn: (on) => set({ on }),
}));

export function useOffline(): boolean {
  const [offline, setOffline] = useState(() =>
    Platform.OS === 'web' && typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return offline;
}
