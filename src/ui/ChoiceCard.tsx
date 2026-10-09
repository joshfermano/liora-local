import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from './Icon';
import { PressableSurface, STANDARD_EASE } from './PressableSurface';
import { Text } from './Text';
import { EDGE, SURFACE } from './theme';

// Every layer stays mounted; choosing crossfades them over 220ms, so nothing moves.
export function ChoiceCard({
  label,
  chosen = false,
  onPress,
  disabled,
}: {
  label: string;
  chosen?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const lit = useSharedValue(chosen ? 1 : 0);
  useEffect(() => {
    lit.value = reduce ? (chosen ? 1 : 0) : withTiming(chosen ? 1 : 0, { duration: 220, easing: STANDARD_EASE });
  }, [chosen, reduce, lit]);
  const fillStyle = useAnimatedStyle(() => ({ opacity: lit.value }));
  const plainInk = useAnimatedStyle(() => ({ opacity: 1 - lit.value }));

  return (
    <PressableSurface
      label={label}
      role="radio"
      selected={chosen}
      disabled={disabled}
      onPress={onPress}
      pressScale={0.98}
      surfaceClassName={`${SURFACE.surface} ${EDGE} rounded-pane min-h-choice overflow-hidden justify-center`}
    >
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, fillStyle]}>
        <View className={`flex-1 ${SURFACE.tintFill}`} />
      </Animated.View>
      <View className="flex-row items-center justify-between px-md py-sm">
        <View>
          <Animated.View style={plainInk}>
            <Text variant="body">{label}</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0 }, fillStyle]}>
            <Text variant="body" tone="onTint">
              {label}
            </Text>
          </Animated.View>
        </View>
        <Animated.View style={fillStyle}>
          <Icon name="check" tone="onTint" />
        </Animated.View>
      </View>
    </PressableSurface>
  );
}
