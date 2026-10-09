import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useColors } from './theme';

// Clouds drift inside a lit sphere. Each layer turns at its own pace so the mix never repeats exactly.
function useSpin(ms: number, reduce: boolean, reverse = false) {
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    turn.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1);
  }, [ms, reduce, turn]);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${(reverse ? -360 : 360) * turn.value}deg` }] }));
}

function Cloud({ size, id, color, cx, cy, r }: { size: number; id: string; color: string; cx: number; cy: number; r: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.95} />
          <Stop offset="0.6" stopColor={color} stopOpacity={0.4} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </Svg>
  );
}

export function Orb({ size }: { size: number }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const breath = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    breath.value = withRepeat(withTiming(1.04, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, breath]);
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));
  const slow = useSpin(18000, reduce);
  const fast = useSpin(11000, reduce, true);
  const layer = { position: 'absolute' as const, width: size, height: size };

  return (
    <Animated.View style={[{ width: size, height: size }, breathe]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id="orb-body" cx="42%" cy="34%" r="70%">
              <Stop offset="0" stopColor={c['tint-soft']} />
              <Stop offset="0.45" stopColor={c.tint} />
              <Stop offset="1" stopColor={c.dusk} />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#orb-body)" />
        </Svg>
        <Animated.View style={[layer, slow]}>
          <Cloud size={size} id="orb-peach" color={c.peach} cx={34} cy={68} r={34} />
        </Animated.View>
        <Animated.View style={[layer, fast]}>
          <Cloud size={size} id="orb-dawn" color={c['light-dawn-source']} cx={68} cy={40} r={30} />
        </Animated.View>
        <Animated.View style={[layer, slow]}>
          <Cloud size={size} id="orb-lit" color={c.lit} cx={60} cy={76} r={20} />
        </Animated.View>
        <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id="orb-shine" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c.pearl} stopOpacity={0.85} />
              <Stop offset="1" stopColor={c.pearl} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="orb-rim" cx="50%" cy="50%" r="50%">
              <Stop offset="0.82" stopColor={c.dusk} stopOpacity={0} />
              <Stop offset="1" stopColor={c.dusk} stopOpacity={0.45} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="36" cy="26" rx="22" ry="14" fill="url(#orb-shine)" />
          <Circle cx="50" cy="50" r="50" fill="url(#orb-rim)" />
        </Svg>
      </View>
    </Animated.View>
  );
}
