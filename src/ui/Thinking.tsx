import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Symbol } from './Symbol';
import { useColors } from './theme';

// A band of light sweeps across the brain and then the words, one character at a time.
const BAND = 3;
const SWEEP_MS = 1600;

function brightness(sweep: number, at: number, count: number) {
  'worklet';
  const centre = sweep * (count + BAND * 2) - BAND;
  return Math.max(0, 1 - Math.abs(at - centre) / BAND);
}

function Letter({ ch, at, count, sweep, dim, lit }: { ch: string; at: number; count: number; sweep: SharedValue<number>; dim: string; lit: string }) {
  const style = useAnimatedStyle(() => ({ color: interpolateColor(brightness(sweep.value, at, count), [0, 1], [dim, lit]) }));
  return <Animated.Text style={[{ fontSize: 15, lineHeight: 20 }, style]}>{ch}</Animated.Text>;
}

export function Thinking({ label }: { label: string }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    sweep.value = withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) }), -1);
  }, [reduce, sweep]);

  const chars = [...label];
  const count = chars.length + 2;
  const brain = useAnimatedStyle(() => ({ opacity: reduce ? 1 : 0.45 + 0.55 * brightness(sweep.value, 0, count) }));

  return (
    <View className="flex-row items-center gap-xs" accessible accessibilityLabel={label} accessibilityLiveRegion="polite">
      <Animated.View style={brain}>
        <Symbol name="brain" fallback="brain" tone="tint" size={18} />
      </Animated.View>
      <View className="flex-row flex-wrap" importantForAccessibility="no-hide-descendants">
        {chars.map((ch, i) => (
          <Letter key={i} ch={ch} at={i + 2} count={count} sweep={sweep} dim={c['label-secondary']} lit={reduce ? c['label-secondary'] : c.tint} />
        ))}
      </View>
    </View>
  );
}
