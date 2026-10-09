import { useRouter, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { cardForRule } from '../../src/content/cards';
import { en } from '../../src/content/copy';
import { HeroScene } from '../../src/ui/art';
import { CapsuleButton } from '../../src/ui/CapsuleButton';
import { FactRow } from '../../src/ui/decisionParts';
import { Lattice } from '../../src/ui/Lattice';
import { sourceFor, sourceLine } from '../../src/ui/ruleSource';
import { Screen } from '../../src/ui/Screen';
import { SourceCard } from '../../src/ui/SourceCard';
import { Text } from '../../src/ui/Text';

// "Why?" opens the card linked to the fired rule by id (FR-8), never a retrieved or generated one.
export default function Why() {
  const { rule } = useLocalSearchParams<{ rule: string }>();
  const router = useRouter();
  const card = cardForRule(rule);
  const src = sourceFor(rule);
  return (
    <Screen>
      <View className="gap-xl pt-lg">
        <View className="items-center">
          <HeroScene size={96} season="calm" />
        </View>
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
        <Lattice header={en('decided.rules')}>
          <FactRow label={rule} value={src ? sourceLine(src) : undefined} />
        </Lattice>
        <CapsuleButton variant="neutral" label={en('result.back')} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
