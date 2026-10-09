import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { STANDARD_EASE } from './PressableSurface';
import { EDGE, EDGE_FOCUS, SURFACE, TEXT_TONE, useColors } from './theme';

// No placeholder, ever. The 1.5pt peony edge is always mounted and only crossfades in.
export function TellField({
  value,
  onChangeText,
  label,
}: {
  value: string;
  onChangeText: (t: string) => void;
  label: string;
}) {
  const colors = useColors();
  const reduce = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = reduce ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 220, easing: STANDARD_EASE });
  }, [focused, reduce, glow]);
  const edge = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View className={`${SURFACE.surface} ${EDGE} rounded-pane min-h-field max-h-fieldmax`}>
      <TextInput
        multiline
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        textAlignVertical="top"
        cursorColor={colors.tint}
        selectionColor={colors.tint}
        className={`min-h-field p-md text-body ${TEXT_TONE.label}`}
        style={{ outlineStyle: 'none' } as object}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: -1, right: -1, bottom: -1, left: -1 }, edge]}
      >
        <View className={`flex-1 rounded-pane ${EDGE_FOCUS}`} />
      </Animated.View>
    </View>
  );
}
