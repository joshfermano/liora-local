import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { en } from '../../content/copy';
import type { Entry } from '../../core/types';
import { useTellStore } from '../../store/tell';
import { CapsuleButton } from '../CapsuleButton';
import { ExplainLinks } from '../decisionParts';
import { EmergencyButtons } from '../EmergencyButtons';
import { Screen } from '../Screen';
import { Text } from '../Text';

// A skipped question still counts as serious (SR-5), but she sees why, and can answer after all.
export function SkippedSafe({ entry }: { entry: Entry }) {
  const router = useRouter();
  const reopen = useTellStore((s) => s.reopenFollowUp);
  return (
    <Screen>
      <View className="gap-xl pt-xxl">
        <View className="gap-sm">
          <Text variant="title1" accessibilityRole="header">
            {en('skip.title')}
          </Text>
          <Text variant="body">{en('skip.body')}</Text>
        </View>
        <View className="gap-sm">
          <CapsuleButton variant="filled" label={en('skip.answer')} onPress={() => reopen()} />
          <EmergencyButtons />
          <CapsuleButton variant="plain" label={en('result.show_nurse')} onPress={() => router.push(`/card/${entry.id}`)} />
        </View>
        <ExplainLinks id={entry.id} />
      </View>
    </Screen>
  );
}
