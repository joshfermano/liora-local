import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { PressableSurface } from './PressableSurface';
import { Text } from './Text';
import { SURFACE, useColors } from './theme';

const BOX = 40;
const C = BOX / 2;
const DASH_R = 15;
const SEGMENTS = 16;
const CIRCUMFERENCE = 2 * Math.PI * DASH_R;
const SEGMENT = CIRCUMFERENCE / SEGMENTS;

export interface CycleDayProps {
  num: number;
  label: string;
  logged: boolean;
  estimated: boolean;
  today: boolean;
  selected: boolean;
  symptom: boolean;
  mood: boolean;
  onPress: () => void;
}

// Solid peony = logged. Hollow with a dashed edge = estimated. Dots sit in two fixed slots.
export const CycleDay = memo(function CycleDay(p: CycleDayProps) {
  const colors = useColors();
  return (
    <PressableSurface
      label={p.label}
      role="button"
      selected={p.selected}
      onPress={p.onPress}
      pressScale={0.98}
      className="flex-1"
      surfaceClassName={`h-12 items-center justify-center rounded-sm ${p.selected ? SURFACE.fill : ''}`}
    >
      <View style={{ width: BOX, height: BOX }} className="items-center justify-center">
        <Svg width={BOX} height={BOX} style={{ position: 'absolute' }}>
          {p.logged ? <Circle cx={C} cy={C} r={16} fill={colors['tint-fill']} /> : null}
          {p.estimated && !p.logged ? (
            <Circle
              cx={C}
              cy={C}
              r={DASH_R}
              fill="none"
              stroke={colors.tint}
              strokeWidth={1.5}
              strokeDasharray={`${SEGMENT * 0.6} ${SEGMENT * 0.4}`}
            />
          ) : null}
          {p.today ? <Circle cx={C} cy={C} r={18} fill="none" stroke={colors['label-secondary']} strokeWidth={1} /> : null}
        </Svg>
        <Text variant="subheadline" tone={p.logged ? 'onTint' : 'label'} className="tabular-nums">
          {p.num}
        </Text>
      </View>
      <View className="flex-row gap-xxs" style={{ height: 6 }}>
        <View
          style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors['label-secondary'], opacity: p.symptom ? 1 : 0 }}
        />
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.dusk, opacity: p.mood ? 1 : 0 }} />
      </View>
    </PressableSurface>
  );
});
