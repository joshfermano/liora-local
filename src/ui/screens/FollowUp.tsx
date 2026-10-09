import { useState } from 'react';
import { View } from 'react-native';
import { en, fil } from '../../content/copy';
import type { Entry } from '../../core/types';
import { useTellStore } from '../../store/tell';
import { CapsuleButton } from '../CapsuleButton';
import { ChoiceCard } from '../ChoiceCard';
import { DecidedLink } from '../DecidedLink';
import { Pair } from '../Pair';
import { Screen } from '../Screen';
import { Text } from '../Text';

type Answer = 'yes' | 'no' | 'skip';

// One question, a yes and a no, a plain Skip, and what skipping means (FR-4).
export function FollowUp({ entry }: { entry: Entry }) {
  const answerFollowUp = useTellStore((s) => s.answerFollowUp);
  const [chosen, setChosen] = useState<Answer | null>(null);
  const question = entry.decision.follow_up?.question_id ?? 'fu.unknown';

  const answer = (a: Answer) => {
    if (chosen) return;
    setChosen(a);
    void answerFollowUp(a);
  };

  return (
    <Screen>
      <View className="gap-xxl pt-xxl">
        <Pair copyKey={question} large="title3" small="body" />
        <View className="gap-xs">
          <ChoiceCard label={en('result.yes')} chosen={chosen === 'yes'} onPress={() => answer('yes')} />
          <ChoiceCard label={en('result.no')} chosen={chosen === 'no'} onPress={() => answer('no')} />
        </View>
        <View className="gap-xxs">
          <View className="self-start">
            <CapsuleButton variant="plain" label={en('result.skip')} onPress={() => answer('skip')} />
          </View>
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
