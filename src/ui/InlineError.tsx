import { View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

// The danger glyph always travels with the words; the field above does not turn red.
export function InlineError({ message }: { message: string }) {
  return (
    <View className="flex-row items-start gap-xs px-md pt-xs" accessibilityRole="alert">
      <View className="pt-0.5">
        <Icon name="danger" tone="urgent" size={16} />
      </View>
      <Text variant="footnote" tone="urgent" className="flex-1">
        {message}
      </Text>
    </View>
  );
}
