import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { bestCard } from '../../content/cards';
import { en } from '../../content/copy';
import type { Entry } from '../../core/types';
import { useTellStore } from '../../store/tell';
import { CapsuleButton } from '../CapsuleButton';
import { Lattice } from '../Lattice';
import { Screen } from '../Screen';
import { SourceCard } from '../SourceCard';
import { Text } from '../Text';

// Fixed calm copy, the "go right away if you notice" list, then the best card (FR-7).
export function Calm({ entry }: { entry: Entry }) {
  const router = useRouter();
  const reset = useTellStore((s) => s.reset);
  const card = bestCard(entry);

  return (
    <Screen>
      <View className="gap-xl pt-xxl">
        <Text variant="body">
          {en('calm.copy')}
        </Text>
        <Lattice header={en('calm.watch.header')}>
          <View className="min-h-tap justify-center px-md py-sm">
            <Text variant="body">{en('calm.watch.items')}</Text>
          </View>
        </Lattice>
        {card ? (
          <SourceCard card={card} />
        ) : (
          <Text variant="body" tone="secondary">
            {en('result.ask_checkup')}
          </Text>
        )}
        <CapsuleButton
          variant="neutral"
          label={en('result.home')}
          onPress={() => {
            reset();
            router.replace('/');
          }}
        />
      </View>
    </Screen>
  );
}
