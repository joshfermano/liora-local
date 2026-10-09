import { useState } from 'react';
import { View } from 'react-native';
import { en, fil } from '../../content/copy';
import type { Entry } from '../../core/types';
import { useTellStore } from '../../store/tell';
import { CapsuleButton } from '../CapsuleButton';
import { DecidedLink } from '../DecidedLink';
import { Pair } from '../Pair';
import { Screen } from '../Screen';
import { SwipeCard } from '../SwipeCard';
import { Text } from '../Text';

type Answer = 'yes' | 'no' | 'skip';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

// One question on a card she can swipe (right yes, left no), the same yes and no as buttons, a plain
// Skip, and what skipping means (FR-4).
export function FollowUp({ entry }: { entry: Entry }) {
  const answerFollowUp = useTellStore((s) => s.answerFollowUp);
  const [chosen, setChosen] = useState<Answer | null>(null);
  const question = entry.decision.follow_up?.question_id ?? 'fu.unknown';

  const code = entry.decision.follow_up?.code;
  const answer = (a: Answer) => {
    if (chosen) return;
    setChosen(a);
    // A failed save must not leave the buttons locked.
    answerFollowUp(a).catch(() => setChosen(null));
  };

  return (
    <Screen>
      <View className="gap-xxl pt-xxl">
        <Pair copyKey="followup.comfort" large="body" small="subheadline" />
        <SwipeCard onAnswer={(yes) => answer(yes ? 'yes' : 'no')} disabled={chosen !== null}>
          <View className="gap-xs py-lg">
            <Pair copyKey={question} large="title3" small="body" />
            {code ? (
              <Text variant="subheadline" tone="secondary">
                {fill(en('followup.about'), { sign: en(`sign.${code}`) })}
              </Text>
            ) : null}
          </View>
        </SwipeCard>
        <View className="gap-sm">
          <CapsuleButton variant="plain" label={en('result.skip')} onPress={() => answer('skip')} disabled={chosen !== null} />
        </View>
        <View className="gap-xxs px-md">
          <Text variant="footnote" tone="secondary">
            {fil('followup.skip_means')}
          </Text>
          {fil('followup.skip_means') === en('followup.skip_means') ? null : (
            <Text variant="footnote" tone="secondary">
              {en('followup.skip_means')}
            </Text>
          )}
        </View>
        <DecidedLink id={entry.id} />
      </View>
    </Screen>
  );
}
