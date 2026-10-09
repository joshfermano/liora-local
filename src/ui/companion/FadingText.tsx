import { useRef } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from '../Text';

const STEP_MS = 28;
const MAX_DELAY_MS = 420;

// A reply still being written: each word that arrives fades in, a little after the one before it.
// Words already on screen keep their keys, so only the new ones animate.
export function FadingText({ text }: { text: string }) {
  const shown = useRef(0);
  const words = text.match(/\s*\S+\s*/g) ?? [];
  const start = Math.min(shown.current, words.length);
  shown.current = words.length;
  return (
    <View className="flex-row flex-wrap" accessible accessibilityLabel={text}>
      {words.map((w, i) => (
        <Animated.View key={i} entering={i >= start ? FadeIn.duration(320).delay(Math.min((i - start) * STEP_MS, MAX_DELAY_MS)) : undefined}>
          <Text variant="body">{w}</Text>
        </Animated.View>
      ))}
    </View>
  );
}
