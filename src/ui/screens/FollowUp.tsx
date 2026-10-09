import { useState } from 'react';
import { View } from 'react-native';
import { en, fil } from '../../content/copy';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
import type { Entry } from '../../core/types';
import { useTellStore } from '../../store/tell';
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
        <View className="gap-xs">
          <Pair copyKey={question} large="title3" small="body" />
          {code ? (
            <Text variant="subheadline" tone="secondary">
              {fill(en('followup.about'), { sign: en(`sign.${code}`) })}
            </Text>
          ) : null}
        </View>
        <View className="gap-sm">
          <ChoiceCard label={en('result.yes')} chosen={chosen === 'yes'} onPress={() => answer('yes')} />
          <ChoiceCard label={en('result.no')} chosen={chosen === 'no'} onPress={() => answer('no')} />
          <ChoiceCard label={en('result.skip')} chosen={chosen === 'skip'} onPress={() => answer('skip')} />
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
