import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { View } from 'react-native';
import { en, fil, severityKey, signKey } from '../../content/copy';
import type { Context, Entry } from '../../core/types';
import { CapsuleButton } from '../CapsuleButton';
import { Pair } from '../Pair';
import { Screen } from '../Screen';
import { useName } from '../name';
import { Text } from '../Text';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-xxs">
      <Pair copyKey={label} large="footnote" small="footnote" largeTone="secondary" />
      {children}
    </View>
  );
}

// Raised Pearl, system face, no decoration: a nurse reads it fast (FR-6).
export function NurseCard({ entry, context }: { entry: Entry; context: Context }) {
  const router = useRouter();
  const name = useName();
  const figure = context.status === 'postpartum' ? context.days_since_birth : context.status === 'pregnant' ? context.weeks : undefined;
  const figureKey = context.status === 'postpartum' ? 'nurse.days_since_birth' : 'nurse.weeks';
  const logged = new Date(entry.created_at);
  const bp = context.bp;

  return (
    <Screen raised field={false}>
      <View className="gap-xl pt-lg">
        {name ? <Text variant="display">{name}</Text> : null}
        {figure !== undefined ? (
          <Fact label={figureKey}>
            <Text variant="display">{figure}</Text>
          </Fact>
        ) : null}
        <Fact label="nurse.signs">
          {entry.findings.map((f) => (
            <Text key={f.code} variant="title2">
              {fil(signKey(f.code))} · {fil(severityKey(f.severity))}
            </Text>
          ))}
        </Fact>
        <Fact label="nurse.logged">
          <Text variant="title2">{format(logged, 'h:mm a, d MMM yyyy')}</Text>
        </Fact>
        {bp ? (
          <Fact label="nurse.bp">
            <Text variant="title2">
              {bp.systolic}/{bp.diastolic}
            </Text>
          </Fact>
        ) : null}
        <CapsuleButton variant="neutral" label={en('result.back')} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
