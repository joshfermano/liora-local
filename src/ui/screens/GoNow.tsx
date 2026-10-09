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
import { useMargin } from '../Screen';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { EDGE, SEPARATOR, SURFACE } from '../theme';
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
          <View className="gap-sm">
            <View className="flex-row items-center gap-xs px-xs" accessibilityRole="header">
              <Symbol name="exclamationmark.triangle.fill" fallback="danger" tone="urgent" size={16} />
              <Text variant="headline" className="flex-1">
                {fil('go.signs.header')}
              </Text>
            </View>
            <View className={`${SURFACE.surface} ${EDGE} rounded-pane overflow-hidden`}>
              {codes.map((code, i) => {
                const finding = entry.findings.find((f) => f.code === code);
                return (
                  <View key={code}>
                    {i > 0 ? <View className={`ml-[60px] h-px ${SEPARATOR}`} /> : null}
                    <View
                      accessible
                      accessibilityLabel={finding ? `${fil(signKey(code))}, ${fil(severityKey(finding.severity))}` : fil(signKey(code))}
                      className="min-h-choice flex-row items-center gap-sm px-md py-sm"
                    >
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-urgent-fill">
                        <Symbol name="exclamationmark" fallback="danger" tone="onUrgent" size={14} />
                      </View>
                      <Text variant="headline" className="flex-1">
                        {fil(signKey(code))}
                      </Text>
                      {finding ? (
                        <View className="rounded-full border border-urgent px-sm py-0.5 dark:border-urgent-dark">
                          <Text variant="caption1" tone="urgent" className="font-semibold">
                            {fil(severityKey(finding.severity))}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {sources.length > 0 ? (
            <View className="gap-sm">
              <Text variant="headline" accessibilityRole="header" className="px-xs">
                {en('go.source.header')}
              </Text>
              {sources.map((src, i) => (
                <View
                  key={i}
                  accessible
                  accessibilityLabel={`${src.title}. ${sourceLine(src)}`}
                  className={`${SURFACE.surface} ${EDGE} rounded-pane flex-row gap-sm p-md`}
                >
                  <View className="pt-0.5">
                    <Symbol name="book.closed.fill" fallback="list" tone="tintSoftInk" size={16} />
                  </View>
                  <View className="flex-1 gap-xxs">
                    <Text variant="subheadline" className="font-semibold">
                      {src.title}
                    </Text>
                    <Text variant="footnote" tone="secondary">
                      {sourceLine(src)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <ExplainLinks id={entry.id} ruleId={firstRule} />
        </View>
      </ScrollView>
    </View>
  );
}
