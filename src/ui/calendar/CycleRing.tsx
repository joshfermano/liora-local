import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '../Text';
import { useColors } from '../theme';

const SIZE = 132;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

// Day N of the average cycle as an arc. A cycle that runs long fills the ring and stays full.
export function CycleRing({ day, length, label }: { day: number; length: number; label: string }) {
  const colors = useColors();
  const fraction = Math.min(1, Math.max(0, day / length));
  return (
    <View accessible accessibilityLabel={label} style={{ width: SIZE, height: SIZE }} className="items-center justify-center">
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={colors['tint-soft']} strokeWidth={STROKE} />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={colors.tint}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${C * fraction} ${C}`}
        />
      </Svg>
      <Text variant="display" accessibilityElementsHidden importantForAccessibility="no">
        {day}
      </Text>
    </View>
  );
}
