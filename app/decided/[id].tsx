import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { en, fil, severityKey, signKey } from '../../src/content/copy';
import { dangerRulesApply } from '../../src/core/pipeline';
import type { Context, Entry, Finding, FindingSource } from '../../src/core/types';
import { DANGER_CODES } from '../../src/core/vocabulary';
import { useTellStore } from '../../src/store/tell';
import { CapsuleButton } from '../../src/ui/CapsuleButton';
import { SeasonMark } from '../../src/ui/art';
import { FactRow } from '../../src/ui/decisionParts';
import { sourceFor, sourceLine } from '../../src/ui/ruleSource';
import { Screen } from '../../src/ui/Screen';
import { Symbol } from '../../src/ui/Symbol';
import { Text } from '../../src/ui/Text';
import { EDGE, SEPARATOR, SURFACE } from '../../src/ui/theme';

const READERS: FindingSource[] = ['lexicon', 'embedding', 'llm', 'checklist'];

const isDanger = (code: string) => (DANGER_CODES as readonly string[]).includes(code);
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
const RANK = { severe: 3, unknown: 2, moderate: 1, mild: 0 } as const;

// One row per label: "severe_headache" and "headache" both read Headache, so the danger one stays.
function oncePerLabel(found: Finding[]): Finding[] {
  const byLabel = new Map<string, Finding>();
  for (const f of found) {
    const label = fil(signKey(f.code));
    const prev = byLabel.get(label);
    const better = !prev || (isDanger(f.code) && !isDanger(prev.code)) || RANK[f.severity] > RANK[prev.severity];
    if (better) byLabel.set(label, f);
  }
  return [...byLabel.values()];
}

const ruleName = (id: string) =>
  id.startsWith('ANC.DT.01.') ? fill(en('handoff.rule.sign'), { sign: en(signKey(id.slice('ANC.DT.01.'.length))) }) : en(`handoff.rule.${id}`);

const confidenceWord = (c: number) =>
  en(c >= 0.9 ? 'decided.conf.high' : c >= 0.6 ? 'decided.conf.mid' : 'decided.conf.low');

// Shows which part found what, which rules fired and which models ran (FR-12); no AI text.
export default function Decided() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const entry = useTellStore((s) => s.current);
  const context = useTellStore((s) => s.context);
  if (!entry || entry.id !== id) return <Redirect href="/" />;
  return <Body entry={entry} context={context} onBack={() => router.back()} />;
}

type Tone = 'go' | 'ask' | 'calm';
const OUTCOME: Record<Entry['decision']['level'], { tone: Tone; key: string; sf: string; fallback: 'danger' | 'info' | 'check' }> = {
  go_now: { tone: 'go', key: 'decided.outcome.go_now', sf: 'exclamationmark.triangle.fill', fallback: 'danger' },
  follow_up: { tone: 'ask', key: 'decided.outcome.follow_up', sf: 'questionmark.circle.fill', fallback: 'info' },
  ok: { tone: 'calm', key: 'decided.outcome.ok', sf: 'checkmark.circle.fill', fallback: 'check' },
};

// One step of the story, on a thin line that joins it to the next.
function Step({ n, title, last = false, children }: { n: number; title: string; last?: boolean; children: ReactNode }) {
  return (
    <View className="flex-row gap-sm">
      <View className="items-center">
        <View className={`h-7 w-7 items-center justify-center rounded-full ${SURFACE.tintSoft}`}>
          <Text variant="footnote" tone="tintSoftInk" className="font-semibold">
            {n}
          </Text>
        </View>
        {last ? null : <View className={`mt-xxs w-px flex-1 ${SEPARATOR}`} />}
      </View>
      <View className={`flex-1 gap-sm ${last ? '' : 'pb-xl'}`}>
        <Text variant="headline" accessibilityRole="header" className="pt-0.5">
          {title}
        </Text>
        {children}
      </View>
    </View>
  );
}

function Chip({ label, detail, danger }: { label: string; detail: string; danger: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${detail}`}
      className={`flex-row items-center gap-xxs rounded-full px-sm py-xxs ${
        danger ? 'border border-urgent dark:border-urgent-dark' : `${SURFACE.tintSoft}`
      }`}
    >
      {danger ? <Symbol name="exclamationmark.triangle.fill" fallback="danger" tone="urgent" size={12} /> : null}
      <Text variant="subheadline" tone={danger ? 'urgent' : 'tintSoftInk'} className="font-semibold">
        {label}
      </Text>
      <Text variant="subheadline" tone={danger ? 'urgent' : 'tintSoftInk'}>
        {`· ${detail}`}
      </Text>
    </View>
  );
}

function Body({ entry, context, onBack }: { entry: Entry; context: Context; onBack: () => void }) {
  const checked = dangerRulesApply(context, entry.input, entry.text);
  const rules = [...new Set(entry.decision.fired.map((f) => f.rule_id))].map((id): [string, string | undefined] => {
    const src = sourceFor(id);
    return [id, src ? sourceLine(src) : undefined];
  });
  const outcome = OUTCOME[entry.decision.level];
  const read = READERS.map((reader) => ({ reader, found: oncePerLabel(entry.findings.filter((f) => f.sources.includes(reader))) }));
  const heard = read.filter((r) => r.found.length > 0);
  const silent = read.filter((r) => r.found.length === 0).map((r) => en(`decided.reader.${r.reader}`));
  const card =
    outcome.tone === 'go' ? SURFACE.alarm : outcome.tone === 'ask' ? SURFACE.tintSoft : `${SURFACE.surface} ${EDGE}`;
  const ink = outcome.tone === 'go' ? 'onUrgent' : outcome.tone === 'ask' ? 'tintSoftInk' : 'label';

  return (
    <Screen>
      <View className="gap-xl pt-lg">
        <Appear order={0}>
          <View className="gap-md">
            <View className="flex-row items-center gap-sm">
              <SeasonMark season="calm" size={28} />
              <Text variant="displayHeading" accessibilityRole="header" className="flex-1">
                {en('decided.title')}
              </Text>
            </View>
            <View className={`${card} rounded-pane gap-sm p-lg`}>
              <Text variant="footnote" tone={ink} className="uppercase">
                {en('decided.you_said')}
              </Text>
              <Text variant="title3" tone={ink}>
                {`“${entry.text}”`}
              </Text>
              <View className="flex-row items-center gap-xs pt-xxs">
                <Symbol name={outcome.sf as never} fallback={outcome.fallback} tone={ink} size={18} />
                <Text variant="headline" tone={ink} className="flex-1">
                  {en(outcome.key)}
                </Text>
              </View>
            </View>
          </View>
        </Appear>

        <Appear order={1}>
          <View>
            <Step n={1} title={en('decided.step.read')}>
              {heard.map(({ reader, found }) => (
                <View key={reader} className="gap-xs">
                  <Text variant="footnote" tone="secondary">
                    {en(`decided.reader.${reader}`)}
                  </Text>
                  <View className="flex-row flex-wrap gap-xs">
                    {found.map((f) => (
                      <Chip
                        key={f.code}
                        label={fil(signKey(f.code))}
                        danger={checked && isDanger(f.code)}
                        detail={`${fil(severityKey(f.severity))}${
                          reader === 'llm' && f.confidence !== null ? ` · ${confidenceWord(f.confidence)} (${f.confidence.toFixed(2)})` : ''
                        }`}
                      />
                    ))}
                  </View>
                </View>
              ))}
              {silent.length > 0 ? (
                <Text variant="footnote" tone="tertiary">
                  {fill(en('decided.silent'), { readers: silent.join(', ') })}
                </Text>
              ) : null}
            </Step>
            <Step n={2} title={en('decided.step.rules')}>
              <Text variant="subheadline" tone="secondary">
                {en(checked ? 'decided.scope.on' : 'decided.scope.off')}
              </Text>
              {checked ? (
                <View className={`${SURFACE.surface} ${EDGE} rounded-pane overflow-hidden`}>
                  {rules.length === 0 ? (
                    <FactRow label={en('decided.rules.none')} />
                  ) : (
                    rules.map(([id, line], i) => (
                      <View key={id}>
                        {i > 0 ? <View className={`h-px ${SEPARATOR}`} /> : null}
                        <FactRow label={ruleName(id)} value={line} danger />
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </Step>
            <Step n={3} title={en('decided.step.models')} last>
              {entry.models.length === 0 ? (
                <Text variant="subheadline" tone="secondary">
                  {en('decided.models.none')}
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-xs">
                  {entry.models.map((m) => (
                    <View key={`${m.role}-${m.id}`} className={`${SURFACE.surface} ${EDGE} rounded-sm gap-0.5 px-sm py-xs`}>
                      <Text variant="subheadline" className="font-semibold">
                        {m.id}
                      </Text>
                      <Text variant="caption1" tone="secondary">
                        {`${m.role} · ${m.version}`}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Step>
          </View>
        </Appear>

        <Appear order={2}>
          <View className="flex-row items-center gap-xs px-xs">
            <Symbol name="lock.shield" fallback="lock" tone="tertiary" size={14} />
            <Text variant="footnote" tone="tertiary" className="flex-1">
              {en('decided.principle')}
            </Text>
          </View>
        </Appear>
        <CapsuleButton variant="neutral" label={en('result.back')} onPress={onBack} />
      </View>
    </Screen>
  );
}

function Appear({ order, children }: { order: number; children: ReactNode }) {
  return <Animated.View entering={FadeInDown.duration(360).delay(order * 100).reduceMotion(ReduceMotion.System)}>{children}</Animated.View>;
}
