import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { en } from '../src/content/copy';
import { GlassCard } from '../src/ui/Glass';
import { tap } from '../src/ui/haptics';
import { LightField } from '../src/ui/LightField';
import CloudOrb from '../src/ui/orb/CloudOrb';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Symbol } from '../src/ui/Symbol';
import { Text } from '../src/ui/Text';
import { SURFACE, useColors } from '../src/ui/theme';

// The orb starts as a seed, swells just past full size and settles; leaving reverses it.
const SEED = 0.12;
const OVERSHOOT = 1.06;
const out = Easing.out(Easing.cubic);
const inn = Easing.in(Easing.cubic);

export default function Live() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.7, 300);
  const reduce = useReducedMotion();
  const c = useColors();
  const colors = { deepColor: c.dusk, upperColor: c.tint, lowerColor: c.peach, highlightColor: c['tint-soft'], launchColor: c['tint-fill'], spinnerColor: c.tint };
  const closing = useRef(false);

  const scale = useSharedValue(reduce ? 1 : SEED);
  const glow = useSharedValue(0);
  const chrome = useSharedValue(0);

  useEffect(() => {
    glow.value = withDelay(120, withTiming(1, { duration: 300 }));
    chrome.value = withDelay(reduce ? 0 : 320, withTiming(1, { duration: 280, easing: out }));
    if (!reduce) {
      scale.value = withDelay(120, withSequence(withTiming(OVERSHOOT, { duration: 560, easing: out }), withTiming(1, { duration: 240, easing: Easing.inOut(Easing.quad) })));
    }
  }, [reduce, scale, glow, chrome]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    tap();
    const leave = () => router.back();
    chrome.value = withTiming(0, { duration: 160 });
    if (reduce) {
      glow.value = withTiming(0, { duration: 200 }, (done) => {
        if (done) scheduleOnRN(leave);
      });
      return;
    }
    glow.value = withDelay(280, withTiming(0, { duration: 200 }));
    scale.value = withSequence(
      withTiming(OVERSHOOT, { duration: 120, easing: out }),
      withTiming(SEED, { duration: 360, easing: inn }, (done) => {
        if (done) scheduleOnRN(leave);
      }),
    );
  };

  const orbStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: scale.value }] }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chrome.value, transform: [{ translateY: (1 - chrome.value) * -8 }] }));

  return (
    <View className={`flex-1 ${SURFACE.ground}`}>
      <LightField />
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <Animated.View style={orbStyle}>
          <CloudOrb
            size={size}
            colors={colors}
            dom={{ style: { width: size, height: size, backgroundColor: 'transparent' }, scrollEnabled: false, contentInsetAdjustmentBehavior: 'never' }}
          />
        </Animated.View>
      </View>
      <Animated.View style={[{ paddingTop: insets.top + 8 }, chromeStyle]} className="flex-row items-center justify-between px-md">
        <Text variant="displayHeading" accessibilityRole="header">
          {en('liora.live')}
        </Text>
        <PressableSurface label={en('live.close')} onPress={close}>
          <GlassCard interactive className="h-tap w-tap items-center justify-center">
            <Symbol name="xmark" fallback="close" tone="label" size={18} />
          </GlassCard>
        </PressableSurface>
      </Animated.View>
    </View>
  );
}
