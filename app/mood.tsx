import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { en } from '../src/content/copy';
import { PHQ9_CREDIT, PHQ9_ITEMS, PHQ9_OPTIONS, PHQ9_PROMPT } from '../src/content/phq9';
import { score } from '../src/core/phq9/score';
import { useLogStore } from '../src/store/log';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { ChoiceCard } from '../src/ui/ChoiceCard';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function Mood() {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>([]);
  const [above, setAbove] = useState<boolean | null>(null);
  const step = answers.length;

  const choose = (value: number) => {
    const next = [...answers, value];
    if (next.length < PHQ9_ITEMS.length) return setAnswers(next);
    const result = score(next);
    useLogStore.getState().addMood({
      id: newId(),
      created_at: new Date().toISOString(),
      answers: next,
      total: result.total,
      self_harm_flag: result.selfHarm,
    });
    if (result.selfHarm) return router.replace('/crisis');
    setAnswers(next);
    setAbove(result.aboveCutoff);
  };

  const credit = (
    <Text variant="caption1" tone="secondary">
      {PHQ9_CREDIT}
    </Text>
  );

  if (above !== null) {
    return (
      <Screen footer={<CapsuleButton label={en('mood.done')} onPress={() => router.replace('/')} />}>
        <View className="gap-lg pt-xxl pb-lg">
          <Text variant="title2" accessibilityRole="header">
            {en(above ? 'mood.result.high' : 'mood.result.low')}
          </Text>
          {credit}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        step > 0 ? (
          <CapsuleButton variant="plain" label={en('mood.back')} onPress={() => setAnswers(answers.slice(0, -1))} />
        ) : undefined
      }
    >
      <View className="gap-lg pt-xxl pb-lg">
        <Text variant="footnote" tone="secondary">
          {`${step + 1} ${en('mood.of')} ${PHQ9_ITEMS.length}`}
        </Text>
        <Text variant="subheadline" tone="secondary">
          {PHQ9_PROMPT}
        </Text>
        <Text variant="title2" accessibilityRole="header">
          {PHQ9_ITEMS[step]}
        </Text>
        <View className="gap-xs" accessibilityRole="radiogroup">
          {PHQ9_OPTIONS.map((o) => (
            <ChoiceCard key={`${step}-${o.value}`} label={o.label} onPress={() => choose(o.value)} />
          ))}
        </View>
        {credit}
      </View>
    </Screen>
  );
}
