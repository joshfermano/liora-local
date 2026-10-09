import { Linking, View } from 'react-native';
import { en } from '../src/content/copy';
import { CRISIS_HOTLINE } from '../src/content/phq9';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

export default function Crisis() {
  return (
    <Screen
      footer={
        <CapsuleButton
          label={en('crisis.call')}
          onPress={() => void Linking.openURL(`tel:${CRISIS_HOTLINE.call}`).catch(() => {})}
        />
      }
    >
      <View className="gap-lg pt-xxl pb-lg">
        <Text variant="title1" accessibilityRole="header">
          {en('crisis.headline')}
        </Text>
        <Text variant="body">{CRISIS_HOTLINE.text}</Text>
        <Text variant="caption1" tone="secondary">
          {en('crisis.source')}
        </Text>
      </View>
    </Screen>
  );
}
