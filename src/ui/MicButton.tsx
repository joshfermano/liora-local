import { View } from 'react-native';
import { en } from '../content/copy';
import { Icon } from './Icon';
import { PressableSurface } from './PressableSurface';
import { Text } from './Text';
import { SURFACE } from './theme';

export const clock = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Peony, never red: red means danger here. Elapsed time is written in words beside it.
export function MicButton({
  recording,
  elapsed,
  limit,
  onPress,
}: {
  recording: boolean;
  elapsed: number;
  limit: number;
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-center gap-sm">
      <PressableSurface
        label={recording ? en('home.mic.stop') : en('home.mic')}
        onPress={onPress}
        pressScale={0.97}
        surfaceClassName={`h-mic w-mic items-center justify-center rounded-full ${recording ? SURFACE.tintFill : SURFACE.tintSoft}`}
      >
        <Icon name={recording ? 'stop' : 'mic'} tone={recording ? 'onTint' : 'tint'} size={24} />
      </PressableSurface>
      {recording ? (
        <Text variant="subheadline" tone="secondary" accessibilityLiveRegion="polite">
          {clock(elapsed)} {en('home.recording.of')} {clock(limit)}
        </Text>
      ) : null}
    </View>
  );
}
