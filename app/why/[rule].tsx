import { useRouter, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { cardForRule } from '../../src/content/cards';
import { en } from '../../src/content/copy';
import { CapsuleButton } from '../../src/ui/CapsuleButton';
import { Screen } from '../../src/ui/Screen';
import { SourceCard } from '../../src/ui/SourceCard';
import { Text } from '../../src/ui/Text';

// "Why?" opens the card linked to the fired rule by id (FR-8), never a retrieved or generated one.
export default function Why() {
  const { rule } = useLocalSearchParams<{ rule: string }>();
  const router = useRouter();
  const card = cardForRule(rule);
  return (
    <Screen>
      <View className="gap-xl pt-xl">
        <Text variant="displayHeading" accessibilityRole="header">
          {en('why.title')}
        </Text>
        {card ? (
          <SourceCard card={card} />
        ) : (
          <Text variant="body" tone="secondary">
            {en('why.none')}
          </Text>
        )}
        <CapsuleButton variant="neutral" label={en('result.back')} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
