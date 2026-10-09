import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { bestCard } from '../../content/cards';
import { en } from '../../content/copy';
import type { Entry } from '../../core/types';
import { useCompanionStore } from '../../store/companion';
import { useTellStore } from '../../store/tell';
import { HeroScene } from '../art';
import { CapsuleButton } from '../CapsuleButton';
import { ExplainLinks } from '../decisionParts';
import { Lattice } from '../Lattice';
import { Screen } from '../Screen';
import { SourceCard } from '../SourceCard';
import { Text } from '../Text';

// Fixed calm copy, the "go right away if you notice" list, then the best card (FR-7).
export function Calm({ entry }: { entry: Entry }) {
  const router = useRouter();
  const reset = useTellStore((s) => s.reset);
  // The calm quote, the watch list and the cards come from pregnancy and postpartum sources. A woman who
  // is neither gets only the plain fact that it was saved, until sourced wording for her exists.
  const pregnancyCare = useTellStore((s) => s.context.status !== 'neither');
  const card = pregnancyCare ? bestCard(entry) : null;

  return (
    <Screen>
      <View className="gap-xl pt-lg">
        <View className="items-center">
          <HeroScene size={132} season="calm" />
        </View>
        {pregnancyCare ? (
          <>
            <Text variant="title3">{en('calm.copy')}</Text>
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
          </>
        ) : (
          <Text variant="title3">{en('calm.saved')}</Text>
        )}
        <ExplainLinks id={entry.id} ruleId={entry.decision.fired[0]?.rule_id} />
        <CapsuleButton
          label={en('result.home')}
          onPress={() => {
            reset();
            // Asked from the chat: that conversation is done, so it goes to history and the chat starts fresh.
            const thread = useCompanionStore.getState();
            const fromChat = thread.messages.some((m) => m.blocks?.some((b) => b.kind === 'decision' && b.entryId === entry.id));
            if (fromChat) thread.clear();
            router.replace('/');
          }}
        />
      </View>
    </Screen>
  );
}
