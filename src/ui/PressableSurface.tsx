import type { ReactNode } from 'react';
import { Pressable, View, type AccessibilityRole } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export const STANDARD_EASE = Easing.bezier(0.2, 0.7, 0.3, 1);

export interface PressableSurfaceProps {
  children?: ReactNode;
  onPress?: () => void;
  label: string;
  hint?: string;
  role?: AccessibilityRole;
  disabled?: boolean;
  busy?: boolean;
  selected?: boolean;
  // The press dips to this scale: 0.97 for capsules, 0.98 for cards.
  pressScale?: number;
  // Layout classes for the touch target.
  className?: string;
  // Look classes for the surface drawn inside it.
  surfaceClassName?: string;
}

// Static styles only: NativeWind drops function-form `style={({ pressed }) => ...}`.
export function PressableSurface({
  children,
  onPress,
  label,
  hint,
  role = 'button',
  disabled = false,
  busy = false,
  selected,
  pressScale = 0.97,
  className,
  surfaceClassName,
}: PressableSurfaceProps) {
  const reduce = useReducedMotion();
  const dip = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - dip.value * 0.15,
    transform: [{ scale: 1 - dip.value * (1 - pressScale) }],
  }));
  const move = (to: number) => {
    dip.value = reduce ? to : withTiming(to, { duration: 140, easing: STANDARD_EASE });
  };

  return (
    <Pressable
      onPress={disabled || busy ? undefined : onPress}
      onPressIn={disabled ? undefined : () => move(1)}
      onPressOut={() => move(0)}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled, busy, selected }}
      className={className}
    >
      <Animated.View style={style}>
        <View className={surfaceClassName}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}
