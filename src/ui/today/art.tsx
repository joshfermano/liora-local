import Svg, { ClipPath, Defs, G, Line, Path, Rect } from 'react-native-svg';
import { useColors } from '../theme';

const COLS = 3;
const ROWS = 4;
const X0 = 8;
const Y0 = 12;
const W = 56;
const H = 74;
const FILLS: Record<number, 'tint' | 'peach' | 'dusk'> = { 2: 'tint', 4: 'peach', 5: 'tint', 7: 'dusk', 10: 'peach', 11: 'tint' };
const ARCH = 'M8 86 V40 A28 28 0 0 1 64 40 V86 Z';

// A small arched capiz window: panes in tint, peach and dusk, a sill beneath.
export function CapizWindow({ width = 72 }: { width?: number }) {
  const c = useColors();
  const tone = { tint: c.tint, peach: c['light-dawn-fade'], dusk: c.dusk };
  const cw = W / COLS;
  const rh = H / ROWS;
  return (
    <Svg width={width} height={width * (100 / 72)} viewBox="0 0 72 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <ClipPath id="arch">
          <Path d={ARCH} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#arch)">
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const key = FILLS[i];
          return (
            <Rect
              key={i}
              x={X0 + (i % COLS) * cw}
              y={Y0 + Math.floor(i / COLS) * rh}
              width={cw}
              height={rh}
              fill={key ? tone[key] : 'none'}
              opacity={key ? 0.85 : 1}
            />
          );
        })}
        {[1, 2].map((i) => (
          <Line key={`v${i}`} x1={X0 + i * cw} x2={X0 + i * cw} y1={Y0} y2={Y0 + H} stroke={c.dusk} strokeWidth={1.2} />
        ))}
        {[1, 2, 3].map((i) => (
          <Line key={`h${i}`} x1={X0} x2={X0 + W} y1={Y0 + i * rh} y2={Y0 + i * rh} stroke={c.dusk} strokeWidth={1.2} />
        ))}
      </G>
      <Path d={ARCH} fill="none" stroke={c.dusk} strokeWidth={2} />
      <Line x1={2} x2={70} y1={90} y2={90} stroke={c.dusk} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}
