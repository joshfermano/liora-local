import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { en, signKey } from '../src/content/copy';
import { evaluate } from '../src/core/rules';
import { EntrySchema, type DangerCode, type Finding } from '../src/core/types';
import { DANGER_CODES } from '../src/core/vocabulary';
import { useLogStore } from '../src/store/log';
import { useTellStore } from '../src/store/tell';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { ChoiceCard } from '../src/ui/ChoiceCard';
import { InlineError } from '../src/ui/InlineError';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function Checklist() {
  const router = useRouter();
  const [chosen, setChosen] = useState<DangerCode[]>([]);
  const [empty, setEmpty] = useState(false);

  const toggle = (code: DangerCode) => {
    setEmpty(false);
    setChosen((c) => (c.includes(code) ? c.filter((x) => x !== code) : [...c, code]));
  };

  const check = () => {
    if (chosen.length === 0) return setEmpty(true);
    const findings: Finding[] = chosen.map((code) => ({
      code,
      severity: code.startsWith('severe_') ? 'severe' : 'unknown',
      sources: ['checklist'],
      confidence: null,
    }));
    const { context } = useTellStore.getState();
    const entry = EntrySchema.parse({
      id: newId(),
      created_at: new Date().toISOString(),
      text: '',
      input: 'checklist',
      findings,
      extraction: null,
      decision: evaluate(findings, context),
      card_ids: [],
      models: [],
    });
    useLogStore.getState().addEntry(entry);
    useTellStore.setState({ current: entry, status: 'done', error: null });
    router.push({ pathname: '/result/[id]', params: { id: entry.id } });
  };

  return (
    <Screen
      footer={
        <View className="gap-xs">
          {empty ? <InlineError message={en('checklist.none')} /> : null}
          <CapsuleButton label={en('checklist.check')} onPress={check} />
        </View>
      }
    >
      <View className="gap-lg pt-xxl pb-lg">
        <Text variant="title1" accessibilityRole="header">
          {en('checklist.title')}
        </Text>
        <View className="gap-xs">
          {DANGER_CODES.map((code) => (
            <ChoiceCard key={code} label={en(signKey(code))} chosen={chosen.includes(code)} onPress={() => toggle(code)} />
          ))}
        </View>
      </View>
    </Screen>
  );
}
