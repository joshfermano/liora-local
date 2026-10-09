import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { palette } from './tokens';
import { TONE_COLOR, useScheme, type Tone } from './theme';

// One closed set, drawn on a 24 grid at one stroke weight.
const STROKE = 2;

export type IconName =
  | 'mic' | 'stop' | 'lock' | 'danger' | 'check' | 'chevronLeft' | 'chevronRight'
  | 'info' | 'close' | 'phone' | 'calendar' | 'list' | 'reset' | 'live' | 'brain';

function Glyph({ name, color }: { name: IconName; color: string }) {
  const p = { stroke: color, strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  switch (name) {
    case 'mic':
      return (
        <>
          <Rect x="9" y="3" width="6" height="11" rx="3" {...p} />
          <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" {...p} />
        </>
      );
    case 'stop':
      return <Rect x="6" y="6" width="12" height="12" rx="2.5" stroke={color} strokeWidth={STROKE} fill={color} />;
    case 'lock':
      return (
        <>
          <Rect x="5" y="11" width="14" height="10" rx="2.5" {...p} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...p} />
        </>
      );
    case 'danger':
      return (
        <>
          <Path d="M12 3.5 21.5 20h-19L12 3.5Z" {...p} />
          <Path d="M12 10v4.5M12 17.4v.1" {...p} />
        </>
      );
    case 'check':
      return <Path d="m5 12.5 4.5 4.5L19 7.5" {...p} />;
    case 'chevronLeft':
      return <Path d="m15 5-7 7 7 7" {...p} />;
    case 'chevronRight':
      return <Path d="m9 5 7 7-7 7" {...p} />;
    case 'info':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Path d="M12 11v5.5M12 7.6v.1" {...p} />
        </>
      );
    case 'close':
      return <Path d="M6 6l12 12M18 6 6 18" {...p} />;
    case 'phone':
      return <Path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 6a2 2 0 0 1 2-2Z" {...p} />;
    case 'calendar':
      return (
        <>
          <Rect x="4" y="5.5" width="16" height="14.5" rx="3" {...p} />
          <Path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" {...p} />
        </>
      );
    case 'list':
      return <Path d="M9 7h11M9 12h11M9 17h11M4.5 7h.1M4.5 12h.1M4.5 17h.1" {...p} />;
    case 'brain':
      return (
        <>
          <Path d="M12 5.5a3 3 0 0 0-5.5-1.2A3 3 0 0 0 4 9a3 3 0 0 0 .5 5A3 3 0 0 0 7 19a3 3 0 0 0 5 .5Z" {...p} />
          <Path d="M12 5.5a3 3 0 0 1 5.5-1.2A3 3 0 0 1 20 9a3 3 0 0 1-.5 5A3 3 0 0 1 17 19a3 3 0 0 1-5 .5Z" {...p} />
          <Path d="M12 5.5v14" {...p} />
        </>
      );
    case 'live':
      return <Path d="M7 9v6M12 5v14M17 9v6" {...p} />;
    case 'reset':
      return <Path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9M4.5 4.5V9H9" {...p} />;
  }
}

export function Icon({ name, tone = 'label', size = 20 }: { name: IconName; tone?: Tone; size?: number }) {
  const color = palette[useScheme()][TONE_COLOR[tone]];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Glyph name={name} color={color} />
    </Svg>
  );
}
