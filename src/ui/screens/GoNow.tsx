import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { en, fil, severityKey, signKey } from '../../content/copy';
import type { Entry } from '../../core/types';
import { CapsuleButton } from '../CapsuleButton';
import { ExplainLinks } from '../decisionParts';
import { EmergencyButtons } from '../EmergencyButtons';
import { warn } from '../haptics';
import { Icon } from '../Icon';
import { Lattice } from '../Lattice';
import { useMargin } from '../Screen';
import { Text } from '../Text';
import { SURFACE } from '../theme';
import { sourceFor, sourceLine } from '../ruleSource';

// Fixed copy only, in the system face, with no entrance animation (FR-5, SR-4).
export function GoNow({ entry }: { entry: Entry }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const margin = useMargin();
  const fired = entry.decision.fired;
  const codes = [...new Set(fired.flatMap((f) => f.codes))];
  // Several signs can fire the same WHO table; show each source once.
  const sources = [...new Set(fired.map((f) => sourceFor(f.rule_id)).filter((s) => s !== null))];
  const firstRule = fired[0]?.rule_id;
  useEffect(() => {
    warn();
  }, []);

  return (
    <View className={`flex-1 ${SURFACE.ground}`}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}>
        <View className={SURFACE.alarm}>
          <View
            className="w-full max-w-column self-center gap-md"
            style={{ paddingHorizontal: margin, paddingTop: insets.top + 24, paddingBottom: 24 }}
          >
            <View accessible accessibilityRole="alert" className="gap-xs">
              <Icon name="danger" tone="onUrgent" size={36} />
              <Text variant="title1" tone="onUrgent">
                {fil('go.headline')}
              </Text>
              <Text variant="body" tone="onUrgent">
                {en('go.line')}
              </Text>
            </View>
            <CapsuleButton
              variant="onAlarm"
              label={en('result.show_nurse')}
              onPress={() => router.push(`/card/${entry.id}`)}
            />
            <EmergencyButtons onAlarm />
          </View>
        </View>

        <View className="w-full max-w-column self-center gap-xl pt-xl" style={{ paddingHorizontal: margin }}>
          <Lattice header={fil('go.signs.header')}>
            {codes.map((code) => {
              const finding = entry.findings.find((f) => f.code === code);
              return (
                <View key={code} className="min-h-tap flex-row items-center gap-sm px-md py-sm">
                  <Icon name="danger" tone="urgent" />
                  <Text variant="body" className="flex-1">
                    {fil(signKey(code))}
                    {finding ? ` · ${fil(severityKey(finding.severity))}` : ''}
                  </Text>
                </View>
              );
            })}
          </Lattice>

          {sources.length > 0 ? (
            <Lattice header={en('go.source.header')}>
              {sources.map((src, i) => (
                <View key={i} className="min-h-tap justify-center px-md py-sm">
                  <Text variant="body">{sourceLine(src)}</Text>
                </View>
              ))}
            </Lattice>
          ) : null}

          <ExplainLinks id={entry.id} ruleId={firstRule} />
        </View>
      </ScrollView>
    </View>
  );
}
