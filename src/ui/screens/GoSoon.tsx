import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { CARDS } from '../../content/cards';
import { en, signKey } from '../../content/copy';
import { RULES } from '../../core/rules';
import type { Entry } from '../../core/types';
import { CapsuleButton } from '../CapsuleButton';
import { ExplainLinks } from '../decisionParts';
import { EmergencyButtons } from '../EmergencyButtons';
import { Screen } from '../Screen';
import { SourceCard } from '../SourceCard';
import { Text } from '../Text';
import { SURFACE } from '../theme';

// WHO PCPNC's "as soon as possible" list: clear, but not the alarm. The card is the rule's own passage.
export function GoSoon({ entry }: { entry: Entry }) {
  const router = useRouter();
  const fired = entry.decision.fired.map((f) => RULES.find((r) => r.id === f.rule_id)).find((r) => r?.level === 'go_soon');
  const card = CARDS.find((c) => c.id === fired?.card);
  const signs = [...new Set(entry.decision.fired.flatMap((f) => f.codes).map((c) => en(signKey(c))))];
  return (
    <Screen>
      <View className="gap-xl pt-xxl">
        <View className={`${SURFACE.tintSoft} rounded-pane p-lg gap-xs`} accessibilityRole="header">
          <Text variant="title1" tone="tintSoftInk">
            {en('soon.headline')}
          </Text>
          {signs.length ? (
            <Text variant="subheadline" tone="tintSoftInk">
              {signs.join(', ')}
            </Text>
          ) : null}
        </View>
        {card ? <SourceCard card={card} /> : null}
        <View className="gap-sm">
          <EmergencyButtons />
          <CapsuleButton variant="plain" label={en('result.show_nurse')} onPress={() => router.push(`/card/${entry.id}`)} />
        </View>
        <ExplainLinks id={entry.id} />
      </View>
    </Screen>
  );
}
