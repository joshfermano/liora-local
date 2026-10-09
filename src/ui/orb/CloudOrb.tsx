'use dom';

import type { DOMProps } from 'expo/dom';
import { Orb, type CloudAppearance } from 'orb-ui';
import { useEffect } from 'react';

// orb-ui draws with the DOM, so on iOS it runs in an Expo DOM component (a local web view, no network).
export default function CloudOrb({ size, colors }: { size: number; colors: CloudAppearance; dom?: DOMProps }) {
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
  }, []);
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Orb theme={{ name: 'cloud', appearance: colors }} state="listening" size={size} interactive={false} aria-hidden />
    </div>
  );
}
