import { View } from 'react-native';
import type { Mood, Symptom } from '../../core/types';

// The art kit: decorative SVG in palette tokens, hidden from assistive technology.
// Placeholders until the drawings land; every component keeps this exact signature.

export type Season = 'period' | 'calm' | 'pregnant' | 'postpartum';

import type { AvatarMarkName } from './marks';

export { AVATAR_MARKS, type AvatarMarkName } from './marks';

export type FlowMark = 'flow_none' | 'flow_light' | 'flow_medium' | 'flow_heavy';
export type ActivityMark = 'walk' | 'exercise' | 'rest' | 'water' | 'sleep_well' | 'checkup' | 'medicine';
export type LogMarkName = Symptom | Mood | FlowMark | ActivityMark;

const Placeholder = ({ size }: { size: number }) => (
  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }} />
);

// The arched capiz window seen from inside, upper-right pane lit in her season.
export function HeroScene({ size = 120 }: { size?: number; season?: Season }) {
  return <Placeholder size={size} />;
}

// The small window mark that signs the brand.
export function CapizMark({ size = 28 }: { size?: number }) {
  return <Placeholder size={size} />;
}

// Beside the words that name her season: a peony for the period, a moon for the calm days,
// a closed bud while pregnant, an opened bloom after birth.
export function SeasonMark({ size = 20 }: { size?: number; season: Season }) {
  return <Placeholder size={size} />;
}

// Her picture when she has not chosen one: a mark centred in a pearl disc with a nacre edge.
export function AvatarMark({ size = 76 }: { size?: number; mark: AvatarMarkName }) {
  return <Placeholder size={size} />;
}

// One mark beside each choice in the day log, on a 24 grid.
export function LogMark({ size = 20 }: { size?: number; name: LogMarkName; chosen?: boolean }) {
  return <Placeholder size={size} />;
}
