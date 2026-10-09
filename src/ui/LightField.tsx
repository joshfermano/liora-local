import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useColors } from './theme';

// The one gradient: dawn light pooled on the top edge. Static, never animated.
export function LightField({ height = 420 }: { height?: number }) {
  const c = useColors();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="dawn" cx="0.5" cy="0" r="1" fx="0.5" fy="0">
            <Stop offset="0" stopColor={c['light-dawn-source']} stopOpacity="1" />
            <Stop offset="0.45" stopColor={c['light-dawn-fade']} stopOpacity="0.7" />
            <Stop offset="1" stopColor={c['light-dawn-fade']} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#dawn)" />
      </Svg>
    </View>
  );
}
