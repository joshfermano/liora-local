import { useEffect, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import type { Mood, Symptom } from '../../core/types';
import { useColors } from '../theme';
import type { AvatarMarkName } from './marks';

// The art kit: decorative SVG in palette tokens, hidden from assistive technology.

export type Season = 'period' | 'calm' | 'pregnant' | 'postpartum';

export { AVATAR_MARKS, type AvatarMarkName } from './marks';

export type FlowMark = 'flow_none' | 'flow_light' | 'flow_medium' | 'flow_heavy';
export type ActivityMark = 'walk' | 'exercise' | 'rest' | 'water' | 'sleep_well' | 'checkup' | 'medicine';
export type LogMarkName = Symptom | Mood | FlowMark | ActivityMark;

const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
const ROUND = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ARCH = 'M16 44 A34 34 0 0 1 84 44 V86 H16 Z';

// The arched capiz window seen from inside, upper-right pane lit in her season.
export function HeroScene({ size = 120, season = 'calm', animate = false }: { size?: number; season?: Season; animate?: boolean }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const fade = useSharedValue(animate && !reduce ? 0 : 1);
  useEffect(() => {
    if (animate && !reduce) fade.value = withTiming(1, { duration: 620 });
  }, [animate, reduce, fade]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value }));
  const lit = { period: c.tint, calm: c.dusk, pregnant: c.lit, postpartum: c.peach }[season];
  const pw = 24;
  const ph = 19;
  const panes = Array.from({ length: 12 }, (_, i) => ({ i, x: 16 + (i % 3) * pw, y: 10 + Math.floor(i / 3) * ph }));
  return (
    <Animated.View style={[{ width: size, height: size }, style]} {...HIDDEN}>
      <Svg width={size} height={size} viewBox="0 0 100 100" {...HIDDEN}>
        <Defs>
          <ClipPath id="hero-arch">
            <Path d={ARCH} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#hero-arch)">
          {panes.map(({ i, x, y }) => (
            <G key={i}>
              <Rect x={x} y={y} width={pw} height={ph} fill={c.pearl} />
              {i === 2 || i === 5 ? <Rect x={x} y={y} width={pw} height={ph} fill={lit} opacity={0.78} /> : null}
              {i === 4 || i === 7 || i === 8 ? (
                <Rect x={x} y={y} width={pw} height={ph} fill={c.peach} opacity={i === 4 ? 0.2 : 0.3} />
              ) : null}
              <Path d={`M${x + 5} ${y + 13} L${x + 11} ${y + 6}`} stroke={c.nacre} strokeWidth={1} opacity={0.7} {...ROUND} />
            </G>
          ))}
          {[1, 2].map((k) => (
            <Line key={`v${k}`} x1={16 + k * pw} x2={16 + k * pw} y1={8} y2={86} stroke={c.frame} strokeWidth={2} />
          ))}
          {[1, 2, 3].map((k) => (
            <Line key={`h${k}`} x1={16} x2={84} y1={10 + k * ph} y2={10 + k * ph} stroke={c.frame} strokeWidth={2} />
          ))}
        </G>
        <Path d={ARCH} fill="none" stroke={c.frame} strokeWidth={4} strokeLinejoin="round" />
        <Rect x={9} y={86} width={82} height={5} rx={2} fill={c.frame} />
        <Line x1={14} x2={86} y1={95} y2={95} stroke={c.nacre} strokeWidth={1.4} {...ROUND} />
      </Svg>
    </Animated.View>
  );
}

// The small window mark that signs the brand.
export function CapizMark({ size = 28 }: { size?: number }) {
  const c = useColors();
  const arch = 'M4 22 V10.5 A8 8 0 0 1 20 10.5 V22 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...HIDDEN}>
      <Path d={arch} fill={c.pearl} />
      <Path d="M12 2.5 A8 8 0 0 1 20 10.5 H12 Z" fill={c.tint} />
      <Path d="M12 2.5 V16 M4 10.5 H20 M4 16 H20" stroke={c.frame} strokeWidth={1.1} fill="none" />
      <Path d={arch} fill="none" stroke={c.frame} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function Petals({ cx, cy, n, rx, ry, off, fill, stroke, sw }: {
  cx: number; cy: number; n: number; rx: number; ry: number; off: number; fill: string; stroke: string; sw: number;
}) {
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <Ellipse key={k} cx={cx} cy={cy - off} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={sw} opacity={0.9} transform={`rotate(${(360 / n) * k} ${cx} ${cy})`} />
      ))}
    </>
  );
}

// Beside the words that name her season: a peony for the period, a moon for the calm days,
// a closed bud while pregnant, an opened bloom after birth.
export function SeasonMark({ size = 20, season }: { size?: number; season: Season }) {
  const c = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...HIDDEN}>
      {season === 'period' ? (
        <>
          <Petals cx={12} cy={12} n={5} rx={3.4} ry={4.6} off={4.6} fill={c.tint} stroke={c.tint} sw={0.6} />
          <Circle cx={12} cy={12} r={2.6} fill={c['tint-soft-ink']} />
        </>
      ) : null}
      {season === 'calm' ? <Path d="M14 3.5 A9 9 0 1 0 20.5 15 A7.2 7.2 0 0 1 14 3.5 Z" fill={c.dusk} /> : null}
      {season === 'pregnant' ? (
        <>
          <Path d="M12 3 C6.5 8.5 6.5 14.5 12 19 C17.5 14.5 17.5 8.5 12 3Z" fill={c.lit} stroke={c.frame} strokeWidth={1.6} {...ROUND} />
          <Path d="M12 19 V22" stroke={c.frame} strokeWidth={1.6} {...ROUND} />
        </>
      ) : null}
      {season === 'postpartum' ? (
        <>
          <Path d="M12 18 C7 18 3.5 13.5 3.5 9 C7 9.5 10 12 12 18Z" fill={c.peach} stroke={c.tint} strokeWidth={1.2} {...ROUND} />
          <Path d="M12 18 C17 18 20.5 13.5 20.5 9 C17 9.5 14 12 12 18Z" fill={c.peach} stroke={c.tint} strokeWidth={1.2} {...ROUND} />
          <Path d="M12 3.5 C8 8 8 14 12 18 C16 14 16 8 12 3.5Z" fill={c.peach} stroke={c.tint} strokeWidth={1.2} {...ROUND} />
          <Path d="M7 21 H17" stroke={c.frame} strokeWidth={1.6} {...ROUND} />
        </>
      ) : null}
    </Svg>
  );
}

// Her picture when she has not chosen one: a mark centred in a pearl disc with a nacre edge.
export function AvatarMark({ size = 76, mark }: { size?: number; mark: AvatarMarkName }) {
  const c = useColors();
  const line = { stroke: c.frame, strokeWidth: 2.4, fill: 'none', ...ROUND } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" {...HIDDEN}>
      <Circle cx={50} cy={50} r={47} fill={c.pearl} stroke={c.nacre} strokeWidth={3} />
      {mark === 'peony' ? (
        <>
          <Petals cx={50} cy={50} n={5} rx={11} ry={15} off={15} fill={c.tint} stroke={c.tint} sw={1} />
          <Circle cx={50} cy={50} r={8} fill={c['tint-soft-ink']} />
        </>
      ) : null}
      {mark === 'sun' ? (
        <>
          <Circle cx={50} cy={50} r={12} fill={c.lit} stroke={c.frame} strokeWidth={2.4} />
          {Array.from({ length: 8 }, (_, k) => (
            <Line key={k} x1={50} x2={50} y1={24} y2={31} {...line} transform={`rotate(${k * 45} 50 50)`} />
          ))}
        </>
      ) : null}
      {mark === 'moon' ? <Path d="M56 24.6 A26 26 0 1 0 74 60 A21 21 0 0 1 56 24.6Z" fill={c.dusk} /> : null}
      {mark === 'shell' ? (
        <>
          <Path d="M50 72 C30 62 20 44 28 34 C38 24 62 24 72 34 C80 44 70 62 50 72Z" fill={c.lit} stroke={c.frame} strokeWidth={2.4} {...ROUND} />
          <Path d="M50 72 L50 31 M50 72 L34 34 M50 72 L66 34" {...line} strokeWidth={1.4} opacity={0.6} />
          <Path d="M38 61 Q50 53 62 61 M32 52 Q50 40 68 52 M30 43 Q50 30 70 43" {...line} strokeWidth={1.4} opacity={0.6} />
          <Path d="M43 72 H57 L54 77 H46Z" fill={c.frame} />
        </>
      ) : null}
      {mark === 'dawn' ? (
        <>
          <Path d="M32 62 A18 18 0 0 1 68 62Z" fill={c.peach} />
          <Path d="M24 62 H76" {...line} />
          <Path d="M36 69 H64 M42 75 H58" stroke={c.peach} strokeWidth={3} {...ROUND} />
          <Path d="M50 30 V35 M30 40 L34 43 M70 40 L66 43" {...line} strokeWidth={2} />
        </>
      ) : null}
      {mark === 'bud' ? (
        <>
          <Path d="M50 24 C34 40 34 58 50 70 C66 58 66 40 50 24Z" fill={c.lit} stroke={c.frame} strokeWidth={2.6} {...ROUND} />
          <Path d="M50 36 C44 46 44 56 50 64" stroke={c.tint} strokeWidth={2} fill="none" {...ROUND} />
          <Path d="M50 70 V80" {...line} />
        </>
      ) : null}
      {mark === 'bloom' ? (
        <>
          {[-62, 62, -32, 32, 0].map((a) => (
            <Path key={a} d="M50 26 C40 40 40 58 50 70 C60 58 60 40 50 26Z" fill={c.tint} fillOpacity={0.35} stroke={c.tint} strokeWidth={1.8} {...ROUND} transform={`rotate(${a} 50 70)`} />
          ))}
          <Path d="M36 76 H64" {...line} />
        </>
      ) : null}
      {mark === 'pane' ? (
        <>
          <Rect x={30} y={30} width={40} height={40} rx={5} fill={c.pearl} />
          <Rect x={50} y={32} width={18} height={18} fill={c.lit} />
          <Path d="M50 30 V70 M30 50 H70" stroke={c.nacre} strokeWidth={1.6} />
          <Rect x={30} y={30} width={40} height={40} rx={5} {...line} strokeWidth={3.2} />
        </>
      ) : null}
    </Svg>
  );
}

const CLOUD = 'M7.5 15.5 A3.5 3.5 0 0 1 7 8.6 A5 5 0 0 1 16.6 8 A3.8 3.8 0 0 1 17 15.5 Z';
const BOLT = 'M13.5 3 L6 13.5 H11.5 L10.5 21 L18 10 H12.5 Z';
const LEVEL: Partial<Record<LogMarkName, number>> = { flow_none: 0, flow_light: 1 / 3, flow_medium: 2 / 3, flow_heavy: 1 };

// One mark beside each choice in the day log, on a 24 grid.
export function LogMark({ size = 20, name, chosen = false }: { size?: number; name: LogMarkName; chosen?: boolean }) {
  const c = useColors();
  const ink = chosen ? c['tint-soft-ink'] : c.frame;
  const l = { stroke: ink, strokeWidth: 1.6, fill: 'none', ...ROUND } as const;
  const f = { stroke: ink, strokeWidth: 1.6, fill: c.lit, ...ROUND } as const;
  const level = LEVEL[name];
  const dot = (cx: number, cy: number, r: number, fill?: boolean) => <Circle cx={cx} cy={cy} r={r} {...(fill ? f : l)} />;
  let body: ReactNode = null;
  switch (name) {
    case 'flow_none':
    case 'flow_light':
    case 'flow_medium':
    case 'flow_heavy': {
      const drop = 'M12 3.5 C12 3.5 5.5 10.5 5.5 14.5 a6.5 6.5 0 0 0 13 0 C18.5 10.5 12 3.5 12 3.5 Z';
      const top = 21 - 17.5 * (level ?? 0);
      body = (
        <>
          <Defs>
            <ClipPath id={`drop-${name}`}>
              <Rect x={0} y={top} width={24} height={24 - top} />
            </ClipPath>
          </Defs>
          {level ? <Path d={drop} fill={c.tint} clipPath={`url(#drop-${name})`} /> : null}
          <Path d={drop} {...l} />
        </>
      );
      break;
    }
    case 'cramps':
      body = (
        <>
          <Path d="M12 5 V6.5 L8 8.8 L16 11.8 L8 14.8 L12 17 V18.5" {...l} />
          <Rect x={6} y={3} width={12} height={2.4} rx={1.2} {...l} />
          <Rect x={6} y={18.6} width={12} height={2.4} rx={1.2} {...f} />
        </>
      );
      break;
    case 'headache':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.5} {...l} />
          <Path d="M13.2 6 L8.6 12.8 H12 L10.8 18 L15.6 11 H12.2 Z" {...f} />
        </>
      );
      break;
    case 'back_pain':
      body = (
        <>
          <Path d="M9 3.5 C14.5 7 14.5 10 10.5 12 C6.5 14 6.5 17 11 20.5" {...l} />
          {dot(12.6, 8, 2.2, true)}
        </>
      );
      break;
    case 'bloating':
      body = (
        <>
          <Path d="M3.5 12 C3.5 7 7.5 4.5 12 4.5 S20.5 7 20.5 12 16.5 19.5 12 19.5 3.5 17 3.5 12Z" {...l} />
          {dot(12, 12, 3, true)}
        </>
      );
      break;
    case 'fatigue':
      body = (
        <>
          <Rect x={2.5} y={7.5} width={16} height={9} rx={2.2} {...l} />
          <Path d="M20.5 10.8 V13.2" {...l} />
          <Rect x={4.8} y={9.8} width={4} height={4.4} rx={0.8} {...f} />
        </>
      );
      break;
    case 'mood_changes':
      body = (
        <>
          <Path d="M4 8 H17.5 M19.5 16 H6" {...l} />
          <Path d="M14.5 4.8 L19.5 8 L14.5 11.2 Z" {...f} />
          <Path d="M9.5 12.8 L4.5 16 L9.5 19.2" {...l} />
        </>
      );
      break;
    case 'acne':
      body = (
        <>
          {dot(8, 8, 2.2, true)}
          {dot(16, 7, 1.4)}
          {dot(14, 13.5, 2.2)}
          {dot(7, 16.5, 1.4)}
          {dot(17.5, 18, 1.6)}
        </>
      );
      break;
    case 'breast_tenderness':
      body = (
        <>
          <Circle cx={7.4} cy={12} r={4.6} {...f} />
          <Circle cx={16.6} cy={12} r={4.6} {...l} />
        </>
      );
      break;
    case 'sleep_quality':
      body = (
        <>
          <Path d="M10.5 4.5 A8 8 0 1 0 19.5 14.5 A6.5 6.5 0 0 1 10.5 4.5 Z" {...f} />
          <Path d="M14.5 4 H19.5 L14.5 9 H19.5" {...l} strokeWidth={1.4} />
        </>
      );
      break;
    case 'energy':
      body = <Path d={BOLT} {...f} />;
      break;
    case 'stress':
      body = (
        <>
          <Path d="M4 17 C8 3.5 18.5 3.5 14.5 12 C11.5 18 6 12.5 10 8.5 C13.5 5.5 20.5 10 19.5 18" {...l} />
          {dot(16.5, 14.5, 2, true)}
        </>
      );
      break;
    case 'appetite':
      body = (
        <>
          <Path d="M3.5 11 H20.5 A8.5 8.5 0 0 1 12 19.5 A8.5 8.5 0 0 1 3.5 11 Z" {...f} />
          <Path d="M9 21.5 H15" {...l} />
          <Path d="M12 3.5 C10 5.3 14 6.3 12 8.2" {...l} />
        </>
      );
      break;
    case 'nausea':
      body = (
        <>
          <Path d="M3 8 C5.5 4.5 8 4.5 10.5 8 S15.5 11.5 18 8 S20.5 6 21 6.5" {...l} />
          <Path d="M3 17 C5.5 13.5 8 13.5 10.5 17 S15.5 20.5 18 17 S20.5 15 21 15.5" {...l} />
          {dot(12, 12.2, 1.8, true)}
        </>
      );
      break;
    case 'pelvic_pain':
      body = (
        <>
          <Path d="M3.5 7.5 H20.5 M4.5 7.5 C4.5 15 8 19 12 19 C16 19 19.5 15 19.5 7.5" {...l} />
          <Path d="M12 9 L14.8 15 H9.2 Z" {...f} />
        </>
      );
      break;
    case 'calm':
      body = (
        <>
          <Path d="M7.5 11 A4.5 4.5 0 0 1 16.5 11 Z" {...f} />
          <Path d="M3.5 11 H20.5 M6 15 H18 M9 19 H15" {...l} />
        </>
      );
      break;
    case 'joyful':
      body = (
        <>
          <Circle cx={12} cy={12} r={4.4} {...f} />
          {Array.from({ length: 8 }, (_, k) => (
            <Line key={k} x1={12} x2={12} y1={2.8} y2={5} {...l} transform={`rotate(${k * 45} 12 12)`} />
          ))}
        </>
      );
      break;
    case 'energetic':
      body = (
        <>
          <Path d="M7 16 A5 5 0 0 1 17 16 Z" {...f} />
          <Path d="M3 16 H21 M12 8.5 V6 M17.3 10.7 L19.1 8.9 M6.7 10.7 L4.9 8.9 M19.1 13.6 L21.4 12.8 M4.9 13.6 L2.6 12.8" {...l} />
          <Path d="M8 20 H16" {...l} />
        </>
      );
      break;
    case 'romantic':
      body = (
        <>
          <Path d="M12 3.5 C7.8 5.8 6.8 10 8.8 13 C10 14.8 14 14.8 15.2 13 C17.2 10 16.2 5.8 12 3.5Z" {...f} />
          <Path d="M12 14.5 V21 M12 18.5 C9.5 18 8 17 7.5 15.5 C10 15.5 11.5 16.5 12 18.5" {...l} />
        </>
      );
      break;
    case 'tired':
      body = (
        <>
          <Path d="M7.5 15 A4.5 4.5 0 0 1 16.5 15 Z" {...f} />
          <Path d="M3.5 15 H20.5 M6 19 H18" {...l} />
          <Path d="M9.8 5.5 L12 8 L14.2 5.5" {...l} />
        </>
      );
      break;
    case 'anxious':
      body = (
        <>
          <Path d="M3 9 H13.5 A2.6 2.6 0 1 0 11 6.4" {...l} />
          <Path d="M3 13.5 H18 A2.8 2.8 0 1 1 15.4 16.3" {...l} />
          <Path d="M3 18 H9" {...l} />
          {dot(19.5, 8, 1.4, true)}
        </>
      );
      break;
    case 'stressed':
      body = (
        <>
          <Path d={CLOUD} {...l} />
          <Path d="M13.2 10.5 L9.8 15 H12.4 L11.4 20 L15 14.5 H12.4 Z" {...f} />
        </>
      );
      break;
    case 'irritable':
      body = (
        <>
          <Path d="M12 3 C13 7 18 9 18 14.5 A6 6 0 0 1 6 14.5 C6 11.5 8 10.5 8.5 8 C10.5 9 11 7 12 3Z" {...l} />
          <Path d="M12 12 C13 14 15 14.5 15 17 A3 3 0 0 1 9 17 C9 15 11 14.5 12 12Z" {...f} />
        </>
      );
      break;
    case 'sad':
      body = (
        <G transform="translate(0 -3)">
          <Path d={CLOUD} {...f} />
          <Path d="M9 18.5 L8 21.5 M12.5 18.5 L11.5 21.5 M16 18.5 L15 21.5" {...l} />
        </G>
      );
      break;
    case 'walk':
      body = (
        <>
          <Ellipse cx={8} cy={11.5} rx={2.6} ry={3.4} {...f} />
          <Ellipse cx={8} cy={17.6} rx={1.7} ry={1.5} {...l} />
          <Ellipse cx={16} cy={6.5} rx={2.6} ry={3.4} {...l} />
          <Ellipse cx={16} cy={12.6} rx={1.7} ry={1.5} {...l} />
        </>
      );
      break;
    case 'exercise':
      body = (
        <>
          <Rect x={4} y={7.5} width={3.5} height={9} rx={1.2} {...f} />
          <Rect x={16.5} y={7.5} width={3.5} height={9} rx={1.2} {...l} />
          <Path d="M7.5 12 H16.5 M2 10.5 V13.5 M22 10.5 V13.5" {...l} />
        </>
      );
      break;
    case 'rest':
      body = (
        <>
          <Path d="M4 8 Q12 5 20 8 Q18.5 12 20 16 Q12 19 4 16 Q5.5 12 4 8Z" {...l} />
          <Path d="M8.5 10 Q12 9 15.5 10 Q14.8 12 15.5 14 Q12 15 8.5 14 Q9.2 12 8.5 10Z" {...f} />
        </>
      );
      break;
    case 'water':
      body = (
        <>
          <Path d="M7.1 10.5 H16.9 L16 20 H8 Z" fill={c.lit} />
          <Path d="M6.5 4 H17.5 L16 20 H8 Z" {...l} />
        </>
      );
      break;
    case 'sleep_well':
      body = (
        <>
          <Path d="M10.5 4 A8 8 0 1 0 19 14 A6.5 6.5 0 0 1 10.5 4 Z" {...l} />
          <Path d="M17.5 3 L18.5 5.5 L21 6.5 L18.5 7.5 L17.5 10 L16.5 7.5 L14 6.5 L16.5 5.5Z" {...f} strokeWidth={1.2} />
        </>
      );
      break;
    case 'checkup':
      body = (
        <>
          <Rect x={5} y={5} width={14} height={16} rx={2} {...l} />
          <Rect x={9} y={3} width={6} height={4} rx={1.2} {...f} />
          <Path d="M8.5 14 L11 16.5 L15.5 11.5" {...l} />
        </>
      );
      break;
    case 'medicine':
      body = (
        <G transform="rotate(-45 12 12)">
          <Path d="M12 8.5 H7 A3.5 3.5 0 0 0 7 15.5 H12 Z" fill={c.lit} />
          <Rect x={3.5} y={8.5} width={17} height={7} rx={3.5} {...l} />
          <Path d="M12 8.5 V15.5" {...l} />
        </G>
      );
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...HIDDEN}>
      {body}
    </Svg>
  );
}
