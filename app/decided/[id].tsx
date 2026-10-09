import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { en, fil, severityKey, signKey } from '../../src/content/copy';
import type { Entry, FindingSource } from '../../src/core/types';
import { DANGER_CODES } from '../../src/core/vocabulary';
import { useTellStore } from '../../src/store/tell';
import { CapsuleButton } from '../../src/ui/CapsuleButton';
import { Icon } from '../../src/ui/Icon';
import { Lattice } from '../../src/ui/Lattice';
import { sourceFor, sourceLine } from '../../src/ui/ruleSource';
import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';

const READERS: FindingSource[] = ['lexicon', 'embedding', 'llm', 'checklist'];

const confidenceWord = (c: number) =>
  en(c >= 0.9 ? 'decided.conf.high' : c >= 0.6 ? 'decided.conf.mid' : 'decided.conf.low');

// Shows which part found what, which rules fired and which models ran (FR-12); no AI text.
export default function Decided() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const entry = useTellStore((s) => s.current);
  if (!entry || entry.id !== id) return <Redirect href="/" />;
  return <Body entry={entry} onBack={() => router.back()} />;
}

function Body({ entry, onBack }: { entry: Entry; onBack: () => void }) {
  const lines = [
    ...new Set(
      entry.decision.fired.map((f) => {
        const src = sourceFor(f.rule_id);
        return src ? `${f.rule_id} · ${sourceLine(src)}` : f.rule_id;
      }),
    ),
  ];
  return (
    <Screen>
      <View className="gap-xl pt-xl">
        <Text variant="displayHeading" accessibilityRole="header">
          {en('decided.title')}
        </Text>
        {READERS.map((reader) => {
          const found = entry.findings.filter((f) => f.sources.includes(reader));
          return (
            <Lattice key={reader} header={en(`decided.reader.${reader}`)}>
              {found.length === 0 ? (
                <View className="min-h-tap justify-center px-md py-sm">
                  <Text variant="body" tone="secondary">
                    {en('decided.nothing')}
                  </Text>
                </View>
              ) : (
                found.map((f) => (
                  <View key={f.code} className="min-h-tap flex-row items-center gap-sm px-md py-sm">
                    {(DANGER_CODES as readonly string[]).includes(f.code) ? <Icon name="danger" tone="urgent" /> : null}
                    <Text variant="body" className="flex-1">
                      {fil(signKey(f.code))} · {fil(severityKey(f.severity))}
                      {reader === 'llm' && f.confidence !== null
                        ? ` · ${confidenceWord(f.confidence)} (${f.confidence.toFixed(2)})`
                        : ''}
                    </Text>
                  </View>
                ))
              )}
            </Lattice>
          );
        })}
        <Lattice header={en('decided.rules')}>
          {lines.length === 0 ? (
            <View className="min-h-tap justify-center px-md py-sm">
              <Text variant="body" tone="secondary">
                {en('decided.rules.none')}
              </Text>
            </View>
          ) : (
            lines.map((l) => (
              <View key={l} className="min-h-tap justify-center px-md py-sm">
                <Text variant="body">{l}</Text>
              </View>
            ))
          )}
        </Lattice>
        <Lattice header={en('decided.models')}>
          {entry.models.length === 0 ? (
            <View className="min-h-tap justify-center px-md py-sm">
              <Text variant="body">{en('decided.models.none')}</Text>
            </View>
          ) : (
            entry.models.map((m) => (
              <View key={`${m.role}-${m.id}`} className="min-h-tap justify-center px-md py-sm">
                <Text variant="body">
                  {m.role} · {m.id} · {m.version}
                </Text>
              </View>
            ))
          )}
        </Lattice>
        <CapsuleButton variant="neutral" label={en('result.back')} onPress={onBack} />
      </View>
    </Screen>
  );
}
