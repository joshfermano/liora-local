'use dom';

import type { DOMProps } from 'expo/dom';
import { Orb, type CloudAppearance, type OrbState } from 'orb-ui';
import { useEffect } from 'react';

// orb-ui draws with the DOM, so on iOS it runs in an Expo DOM component (a local web view, no network).
export default function CloudOrb({
  size,
  colors,
  state,
  input,
  output,
}: {
  size: number;
  colors: CloudAppearance;
  state: OrbState;
  input: number;
  output: number;
  dom?: DOMProps;
}) {
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Orb
        theme={{ name: 'cloud', appearance: colors }}
        signal={{ state, inputVolume: input, outputVolume: output }}
        size={size}
        interactive={false}
        aria-hidden
      />
    </div>
  );
}
