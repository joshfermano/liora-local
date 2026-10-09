import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { View } from 'react-native';
import { en, fil, severityKey, signKey } from '../../content/copy';
import type { Context, Entry } from '../../core/types';
import { CapsuleButton } from '../CapsuleButton';
import { Lattice } from '../Lattice';
import { Pair } from '../Pair';
import { Screen } from '../Screen';
import { useName } from '../name';
import { useProfile } from '../../store/profile';
import { Text } from '../Text';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-xxs px-md py-md">
      <Pair copyKey={label} large="footnote" small="footnote" largeTone="secondary" />
      {children}
    </View>
  );
}

// Raised Pearl, system face, no decoration: a nurse reads it fast (FR-6).
export function NurseCard({ entry, context }: { entry: Entry; context: Context }) {
  const router = useRouter();
  const name = useName();
  const profile = useProfile();
  const body = [
    ['profile.age', profile.age, 'profile.unit.years'],
    ['profile.height', profile.heightCm, 'profile.unit.cm'],
    ['profile.weight', profile.weightKg, 'profile.unit.kg'],
  ] as const;
  const figure = context.status === 'postpartum' ? context.days_since_birth : context.status === 'pregnant' ? context.weeks : undefined;
  const figureKey = context.status === 'postpartum' ? 'nurse.days_since_birth' : 'nurse.weeks';
  const logged = new Date(entry.created_at);
  const bp = context.bp;

  return (
    <Screen raised field={false}>
      <View className="gap-lg pt-lg">
        {name ? <Text variant="display">{name}</Text> : null}
        <Lattice>
          {[
            figure !== undefined ? (
              <Fact key="figure" label={figureKey}>
                <Text variant="display">{figure}</Text>
              </Fact>
            ) : null,
            <Fact key="signs" label="nurse.signs">
              <View className="gap-xs">
                {entry.findings.map((f) => (
                  <Text key={f.code} variant="title2">
                    {fil(signKey(f.code))} · {fil(severityKey(f.severity))}
                  </Text>
                ))}
              </View>
            </Fact>,
            <Fact key="logged" label="nurse.logged">
              <Text variant="title2">{format(logged, 'h:mm a, d MMM yyyy')}</Text>
            </Fact>,
            bp ? (
              <Fact key="bp" label="nurse.bp">
                <Text variant="title2">
                  {bp.systolic}/{bp.diastolic}
                </Text>
              </Fact>
            ) : null,
            ...body.map(([label, value, unit]) =>
              value === undefined ? null : (
                <Fact key={label} label={label}>
                  <Text variant="title2">
                    {value} {en(unit)}
                  </Text>
                </Fact>
              ),
            ),
          ]}
        </Lattice>
        <CapsuleButton variant="neutral" label={en('result.back')} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
