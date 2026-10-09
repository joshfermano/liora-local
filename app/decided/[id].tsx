import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { en, fil, severityKey, signKey } from '../../src/content/copy';
import type { Entry, FindingSource } from '../../src/core/types';
import { DANGER_CODES } from '../../src/core/vocabulary';
import { useTellStore } from '../../src/store/tell';
import { CapsuleButton } from '../../src/ui/CapsuleButton';
import { SeasonMark } from '../../src/ui/art';
import { FactRow } from '../../src/ui/decisionParts';
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
  const rules = [...new Set(entry.decision.fired.map((f) => f.rule_id))].map((id): [string, string | undefined] => {
    const src = sourceFor(id);
    return [id, src ? sourceLine(src) : undefined];
  });
  return (
    <Screen>
      <View className="gap-xl pt-lg">
        <View className="flex-row items-center gap-sm">
          <SeasonMark season="calm" size={28} />
          <Text variant="displayHeading" accessibilityRole="header" className="flex-1">
            {en('decided.title')}
          </Text>
        </View>
        {READERS.map((reader) => {
          const found = entry.findings.filter((f) => f.sources.includes(reader));
          return (
            <Lattice key={reader} header={en(`decided.reader.${reader}`)}>
              {found.length === 0 ? (
                <FactRow label={en('decided.nothing')} />
              ) : (
                found.map((f) => (
                  <FactRow
                    key={f.code}
                    label={fil(signKey(f.code))}
                    danger={(DANGER_CODES as readonly string[]).includes(f.code)}
                    value={`${fil(severityKey(f.severity))}${
                      reader === 'llm' && f.confidence !== null
                        ? ` · ${confidenceWord(f.confidence)} (${f.confidence.toFixed(2)})`
                        : ''
                    }`}
                  />
                ))
              )}
            </Lattice>
          );
        })}
        <Lattice header={en('decided.rules')}>
          {rules.length === 0 ? (
            <FactRow label={en('decided.rules.none')} />
          ) : (
            rules.map(([id, line]) => <FactRow key={id} label={id} value={line} />)
          )}
        </Lattice>
        <Lattice header={en('decided.models')}>
          {entry.models.length === 0 ? (
            <FactRow label={en('decided.models.none')} />
          ) : (
            entry.models.map((m) => <FactRow key={`${m.role}-${m.id}`} label={m.role} value={`${m.id} · ${m.version}`} />)
          )}
        </Lattice>
        <CapsuleButton variant="neutral" label={en('result.back')} onPress={onBack} />
      </View>
    </Screen>
  );
}
