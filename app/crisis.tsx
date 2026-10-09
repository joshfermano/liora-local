import { Linking, View } from 'react-native';
import { en } from '../src/content/copy';
import { CRISIS_HOTLINE } from '../src/content/phq9';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { EmergencyButtons } from '../src/ui/EmergencyButtons';
import { Lattice } from '../src/ui/Lattice';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

// System face, no light field and no motion: it appears at once and stays calm.
export default function Crisis() {
  return (
    <Screen
      field={false}
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
        <Lattice>
          <View className="px-md py-md">
            <Text variant="title3">{CRISIS_HOTLINE.text}</Text>
          </View>
        </Lattice>
        <Text variant="caption1" tone="secondary">
          {en('crisis.source')}
        </Text>
        <EmergencyButtons />
      </View>
    </Screen>
  );
}
