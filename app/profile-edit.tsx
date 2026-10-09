import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { en } from '../src/content/copy';
import { PROFILE_RANGES, updateProfile, useProfile, type Status } from '../src/store/profile';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { GlassCard } from '../src/ui/Glass';
import { confirm, tap } from '../src/ui/haptics';
import { cleanName } from '../src/ui/name';
import { SegmentedControl, WheelPicker } from '../src/ui/native';
import { Divider } from '../src/ui/profile/parts';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { TEXT_TONE } from '../src/ui/theme';

type Field = 'age' | 'heightCm' | 'weightKg' | 'weeks';

const STATUSES: Status[] = ['pregnant', 'postpartum', 'neither'];
const middle = ([min, max]: readonly [number, number]) => Math.round((min + max) / 2);

export default function ProfileEdit() {
  const router = useRouter();
  const profile = useProfile();
  const [name, setName] = useState(profile.name ?? '');
  const [status, setStatus] = useState<Status | undefined>(profile.status);
  const [values, setValues] = useState<Record<Field, number | undefined>>({
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    weeks: profile.weeks,
  });
  const [open, setOpen] = useState<Field | null>(null);

  const rows: { field: Field; label: string; unit: string }[] = [
    { field: 'age', label: en('profile.age'), unit: en('profile.unit.years') },
    { field: 'heightCm', label: en('profile.edit.height'), unit: en('profile.unit.cm') },
    { field: 'weightKg', label: en('profile.edit.weight'), unit: en('profile.unit.kg') },
    ...(status === 'pregnant' ? [{ field: 'weeks' as const, label: en('setup.weeks'), unit: en('profile.unit.weeks') }] : []),
  ];

  const toggle = (field: Field) => {
    tap();
    if (open === field) return setOpen(null);
    setValues((v) => (v[field] === undefined ? { ...v, [field]: middle(PROFILE_RANGES[field]) } : v));
    setOpen(field);
  };

  const save = () => {
    confirm();
    updateProfile({
      name: cleanName(name) || undefined,
      age: values.age,
      heightCm: values.heightCm,
      weightKg: values.weightKg,
      status,
      weeks: status === 'pregnant' ? values.weeks : undefined,
    });
    router.back();
  };

  return (
    <Screen
      field={false}
      raised
      topInset={false}
      footer={
        <View className="gap-xs px-xs pb-md pt-sm">
          <CapsuleButton label={en('profile.edit.save')} onPress={save} />
          <CapsuleButton variant="plain" label={en('log.cancel')} onPress={() => router.back()} />
        </View>
      }
    >
      <View className="gap-lg pb-lg pt-lg">
        <Text variant="displayTitle" accessibilityRole="header" className="text-center">
          {en('profile.edit.title')}
        </Text>

        <GlassCard>
          <View className="min-h-choice flex-row items-center justify-between gap-md px-md">
            <Text variant="body">{en('profile.name')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              accessibilityLabel={en('profile.name')}
              autoCapitalize="words"
              textContentType="givenName"
              returnKeyType="done"
              maxLength={40}
              className={`min-h-tap flex-1 text-right text-body ${TEXT_TONE.tint}`}
            />
          </View>
        </GlassCard>

        <View className="gap-xs">
          <Text variant="footnote" tone="secondary" className="px-md uppercase">
            {en('profile.edit.status')}
          </Text>
          <SegmentedControl
            label={en('profile.edit.status')}
            value={status}
            options={STATUSES.map((s) => ({ value: s, label: en(`setup.status.${s}`) }))}
            onChange={(s) => {
              setStatus(s as Status);
              if (s !== 'pregnant' && open === 'weeks') setOpen(null);
            }}
          />
        </View>

        <GlassCard>
          {rows.map(({ field, label, unit }, i) => {
            const v = values[field];
            const [min, max] = PROFILE_RANGES[field];
            const shown = v === undefined ? en('profile.edit.not_set') : `${v} ${unit}`;
            return (
              <View key={field}>
                {i > 0 ? <Divider /> : null}
                <PressableSurface
                  label={`${label}, ${shown}`}
                  onPress={() => toggle(field)}
                  pressScale={0.98}
                  surfaceClassName="min-h-choice flex-row items-center justify-between gap-md px-md"
                >
                  <Text variant="body">{label}</Text>
                  <Text variant="body" tone={open === field ? 'tint' : 'secondary'}>
                    {shown}
                  </Text>
                </PressableSurface>
                {open === field && v !== undefined ? (
                  <WheelPicker label={label} unit={unit} min={min} max={max} value={v} onChange={(n) => setValues((x) => ({ ...x, [field]: n as number }))} />
                ) : null}
              </View>
            );
          })}
        </GlassCard>
      </View>
    </Screen>
  );
}
