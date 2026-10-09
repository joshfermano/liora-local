import { type ReactNode, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { en, fil } from '../content/copy';
import { confirm, tap } from './haptics';
import { Text } from './Text';
import { EDGE, SURFACE } from './theme';

// Both languages, once each when Filipino has not been written yet.
const both = (key: string) => (fil(key) === en(key) ? en(key) : `${fil(key)} · ${en(key)}`);

// A deliberate swipe, not a brush: a "no" can lower how seriously Liora takes a sign.
const COMMIT = 0.4;
const FLICK = 900;

export interface SwipeCardProps {
  children: ReactNode;
  onAnswer: (yes: boolean) => void;
  disabled?: boolean;
}

// Right is yes and left is no. The card tilts with her finger, a stamp shows which way it will go, and
// past the point of no return it flies off. Callers keep their buttons: the swipe is a shortcut, never
// the only way to answer, and VoiceOver uses the buttons.
export function SwipeCard({ children, onAnswer, disabled = false }: SwipeCardProps) {
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const x = useSharedValue(0);
  const past = useSharedValue(0);
  const [gone, setGone] = useState(false);

  const commit = (yes: boolean) => {
    confirm();
    setGone(true);
    onAnswer(yes);
  };

  const pan = usePanGesture({
    enabled: !disabled && !gone,
    activeOffsetX: [-12, 12],
    failOffsetY: [-18, 18],
    onUpdate: (e) => {
      'worklet';
      x.value = e.translationX;
      const now = Math.abs(e.translationX) > width * COMMIT ? 1 : 0;
      if (now !== past.value) {
        past.value = now;
        if (now) scheduleOnRN(tap);
      }
    },
    onDeactivate: (e) => {
      'worklet';
      const far = Math.abs(e.translationX) > width * COMMIT;
      const flick = Math.abs(e.velocityX) > FLICK && Math.sign(e.velocityX) === Math.sign(e.translationX);
      if (far || flick) {
        const yes = e.translationX > 0;
        x.value = withTiming((yes ? 1 : -1) * width * 1.4, { duration: reduce ? 0 : 220, easing: Easing.in(Easing.quad) });
        scheduleOnRN(commit, yes);
      } else {
        x.value = withSpring(0, { damping: 18, stiffness: 220 });
        past.value = 0;
      }
    },
  });

  const card = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotate: `${interpolate(x.value, [-width, width], [-12, 12])}deg` }],
  }));
  const yesStamp = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, width * COMMIT], [0, 1], 'clamp') }));
  const noStamp = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-width * COMMIT, 0], [1, 0], 'clamp') }));

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={pan}>
        <Animated.View style={card} className={`${SURFACE.raised} ${EDGE} rounded-sheet p-xl`} accessibilityHint={en('swipe.hint')}>
          {children}
          <Animated.View pointerEvents="none" style={yesStamp} className="absolute left-lg top-lg -rotate-12 rounded-sm border-2 border-tint px-sm py-xxs dark:border-tint-dark">
            <Text variant="headline" tone="tint">
              {both('swipe.yes')}
            </Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={noStamp} className="absolute right-lg top-lg rotate-12 rounded-sm border-2 border-label-secondary px-sm py-xxs dark:border-label-secondary-dark">
            <Text variant="headline" tone="secondary">
              {both('swipe.no')}
            </Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      <View className="flex-row justify-between px-xs pt-sm" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text variant="footnote" tone="secondary">
          {both('swipe.left')}
        </Text>
        <Text variant="footnote" tone="secondary">
          {both('swipe.right')}
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}
