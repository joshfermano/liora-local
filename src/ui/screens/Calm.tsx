import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { bestCard } from '../../content/cards';
import { en } from '../../content/copy';
import type { Entry } from '../../core/types';
import { useCompanionStore } from '../../store/companion';
import { useTellStore } from '../../store/tell';
import { HeroScene } from '../art';
import { CapsuleButton } from '../CapsuleButton';
import { ExplainLinks } from '../decisionParts';
import { Screen } from '../Screen';
import { SourceCard } from '../SourceCard';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { EDGE, SEPARATOR, SURFACE } from '../theme';

function Appear({ order, children }: { order: number; children: ReactNode }) {
  return <Animated.View entering={FadeInDown.duration(380).delay(order * 110).reduceMotion(ReduceMotion.System)}>{children}</Animated.View>;
}

// Fixed calm copy in a soft pane, the WHO "go right away" signs as a scannable list, then the best card
// (FR-7). Every word is the source's; only the layout is ours.
export function Calm({ entry }: { entry: Entry }) {
  const router = useRouter();
  const reset = useTellStore((s) => s.reset);
  // The calm quote, the watch list and the cards come from pregnancy and postpartum sources. A woman who
  // is neither gets only the plain fact that it was saved, until sourced wording for her exists.
  const pregnancyCare = useTellStore((s) => s.context.status !== 'neither');
  const card = pregnancyCare ? bestCard(entry) : null;
  const watchList = en('calm.watch.items')
    .split('\n')
    .map((sign) => sign.trim())
    .filter(Boolean);

  return (
    <Screen>
      <View className="gap-xl pt-lg">
        <View className="items-center">
          <HeroScene size={132} season="calm" />
        </View>
        {pregnancyCare ? (
          <>
            <Appear order={0}>
              <View className={`${SURFACE.tintSoft} rounded-pane flex-row gap-sm p-lg`}>
                <View className="pt-0.5">
                  <Symbol name="checkmark.seal.fill" fallback="check" tone="tintSoftInk" size={22} />
                </View>
                <Text variant="title3" tone="tintSoftInk" className="flex-1">
                  {en('calm.copy')}
                </Text>
              </View>
            </Appear>
            <Appear order={1}>
              <View className="gap-sm">
                <View className="flex-row gap-xs px-xs" accessibilityRole="header">
                  <View className="pt-0.5">
                    <Symbol name="exclamationmark.triangle.fill" fallback="danger" tone="urgent" size={18} />
                  </View>
                  <Text variant="headline" className="flex-1">
                    {en('calm.watch.header')}
                  </Text>
                </View>
                <View className={`${SURFACE.surface} ${EDGE} rounded-pane overflow-hidden`}>
                  {/* The WHO list, word for word, one sign per row so she can scan it. */}
                  {watchList.map((sign, i) => (
                    <View key={i}>
                      {i > 0 ? <View className={`ml-[44px] h-px ${SEPARATOR}`} /> : null}
                      <View className="min-h-tap flex-row items-center gap-sm px-md py-sm">
                        <View className="h-2 w-2 rounded-full bg-urgent dark:bg-urgent-dark" />
                        <Text variant="body" className="flex-1">
                          {sign}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </Appear>
            <Appear order={2}>
              {card ? (
                <SourceCard card={card} />
              ) : (
                <View className={`${SURFACE.surface} ${EDGE} rounded-pane min-h-tap flex-row items-center gap-sm px-md py-sm`}>
                  <Symbol name="info.circle" fallback="info" tone="secondary" size={18} />
                  <Text variant="body" tone="secondary" className="flex-1">
                    {en('result.ask_checkup')}
                  </Text>
                </View>
              )}
            </Appear>
          </>
        ) : (
          <Appear order={0}>
            <View className={`${SURFACE.tintSoft} rounded-pane flex-row items-center gap-sm p-lg`}>
              <Symbol name="checkmark.circle.fill" fallback="check" tone="tintSoftInk" size={22} />
              <Text variant="title3" tone="tintSoftInk" className="flex-1">
                {en('calm.saved')}
              </Text>
            </View>
          </Appear>
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
