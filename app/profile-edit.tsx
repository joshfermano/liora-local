import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { en } from '../src/content/copy';
import { formatPhPhone, typePhPhone } from '../src/core/phone';
import { useLogStore } from '../src/store/log';
import { BLOOD_TYPES, PROFILE_RANGES, updateProfile, useProfile, type BloodType, type Profile, type Status } from '../src/store/profile';
import { GlassCard } from '../src/ui/Glass';
import { confirm, tap } from '../src/ui/haptics';
import { cleanName } from '../src/ui/name';
import { OptionPicker, SegmentedControl, WheelPicker } from '../src/ui/native';
import { Divider } from '../src/ui/profile/parts';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Screen } from '../src/ui/Screen';
import { Text } from '../src/ui/Text';
import { TEXT_TONE } from '../src/ui/theme';

type Field = 'age' | 'heightCm' | 'weightKg' | 'weeks' | 'cycle' | 'period';

const bloodLabel = (b: BloodType) => (b === 'unknown' ? en('blood.unknown') : b);

const RANGES: Record<Field, readonly [number, number]> = { ...PROFILE_RANGES, cycle: [15, 90], period: [1, 14] };
const START: Partial<Record<Field, number>> = { cycle: 28, period: 5 };

const STATUSES: Status[] = ['pregnant', 'postpartum', 'neither'];

export default function ProfileEdit() {
  const router = useRouter();
  const profile = useProfile();
  const cycleSettings = useLogStore((s) => s.cycleSettings);
  const [name, setName] = useState(profile.name ?? '');
  const [status, setStatus] = useState<Status | undefined>(profile.status);
  const [values, setValues] = useState<Record<Field, number | undefined>>({
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    weeks: profile.weeks,
    cycle: cycleSettings.stated_cycle_length,
    period: cycleSettings.stated_period_length,
  });
  const [open, setOpen] = useState<Field | null>(null);
  const [blood, setBlood] = useState<BloodType | undefined>(profile.bloodType);
  const [bloodOpen, setBloodOpen] = useState(false);
  const [contactName, setContactName] = useState(profile.emergency?.name ?? '');
  const [relation, setRelation] = useState(profile.emergency?.relation ?? '');
  const [phone, setPhone] = useState(profile.emergency?.phone ?? '');
  const [error, setError] = useState<string | null>(null);

  const rows: { field: Field; label: string; unit: string }[] = [
    { field: 'age', label: en('profile.age'), unit: en('profile.unit.years') },
    { field: 'heightCm', label: en('profile.edit.height'), unit: en('profile.unit.cm') },
    { field: 'weightKg', label: en('profile.edit.weight'), unit: en('profile.unit.kg') },
    ...(status === 'pregnant' ? [{ field: 'weeks' as const, label: en('setup.weeks'), unit: en('profile.unit.weeks') }] : []),
  ];

  const cycleRows: { field: Field; label: string; unit: string }[] =
    status === 'pregnant'
      ? []
      : [
          { field: 'cycle', label: en('profile.cycle.stated'), unit: en('profile.unit.days') },
          { field: 'period', label: en('profile.period.stated'), unit: en('profile.unit.days') },
        ];

  const toggle = (field: Field) => {
    tap();
    if (open === field) return setOpen(null);
    setValues((v) => (v[field] === undefined ? { ...v, [field]: START[field] ?? Math.round((RANGES[field][0] + RANGES[field][1]) / 2) } : v));
    setOpen(field);
  };

  const save = () => {
    const next: Partial<Profile> = {};
    const cleaned = cleanName(name) || undefined;
    if (cleaned !== profile.name) next.name = cleaned;
    if (status !== profile.status) next.status = status;
    for (const f of ['age', 'heightCm', 'weightKg'] as const) if (values[f] !== profile[f]) next[f] = values[f];
    const weeks = status === 'pregnant' ? values.weeks : undefined;
    if (weeks !== profile.weeks) next.weeks = weeks;
    if (status !== 'pregnant') {
      const stated = {
        stated_cycle_length: values.cycle ?? cycleSettings.stated_cycle_length,
        stated_period_length: values.period ?? cycleSettings.stated_period_length,
      };
      if (stated.stated_cycle_length !== cycleSettings.stated_cycle_length || stated.stated_period_length !== cycleSettings.stated_period_length) {
        useLogStore.getState().setCycleSettings({ ...cycleSettings, ...stated });
      }
    }
    if (blood !== profile.bloodType) next.bloodType = blood;
    const cName = cleanName(contactName);
    const cRelation = relation.trim();
    const cPhone = phone.trim();
    if (!cName && !cRelation && !cPhone) {
      if (profile.emergency) next.emergency = undefined;
    } else {
      const shown = formatPhPhone(cPhone);
      if (!shown) return setError(en('em.phone_error'));
      if (!cName) return setError(en('em.name_error'));
      const contact = cRelation ? { name: cName, relation: cRelation, phone: shown } : { name: cName, phone: shown };
      const was = profile.emergency;
      if (!was || was.name !== contact.name || was.phone !== contact.phone || (was.relation ?? '') !== (cRelation || '')) next.emergency = contact;
    }
    if (Object.keys(next).length > 0) {
      confirm();
      updateProfile(next);
    }
    router.back();
  };

  const renderRows = (list: { field: Field; label: string; unit: string }[]) => (
    <GlassCard>
      {list.map(({ field, label, unit }, i) => {
        const v = values[field];
        const [min, max] = RANGES[field];
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
  );

  return (
    <Screen field={false} raised topInset={false}>
      <View className="gap-lg pb-lg pt-md">
        <View className="flex-row items-center justify-between gap-sm">
          <PressableSurface label={en('log.cancel')} onPress={() => router.back()} surfaceClassName="min-h-tap min-w-tap justify-center">
            <Text variant="body" tone="tint">
              {en('log.cancel')}
            </Text>
          </PressableSurface>
          <Text variant="headline" accessibilityRole="header" className="shrink text-center">
            {en('profile.edit.title')}
          </Text>
          <PressableSurface label={en('profile.edit.save')} onPress={save} surfaceClassName="min-h-tap min-w-tap items-end justify-center">
            <Text variant="headline" tone="tint">
              {en('profile.edit.save')}
            </Text>
          </PressableSurface>
        </View>

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
              if ((s !== 'pregnant' && open === 'weeks') || (s === 'pregnant' && (open === 'cycle' || open === 'period'))) setOpen(null);
            }}
          />
        </View>

        {renderRows(rows)}

        <GlassCard>
          <PressableSurface
            label={`${en('blood.title')}, ${blood ? bloodLabel(blood) : en('profile.edit.not_set')}`}
            onPress={() => {
              tap();
              setBloodOpen((o) => !o);
            }}
            pressScale={0.98}
            surfaceClassName="min-h-choice flex-row items-center justify-between gap-md px-md"
          >
            <Text variant="body">{en('blood.title')}</Text>
            <Text variant="body" tone={bloodOpen ? 'tint' : 'secondary'}>
              {blood ? bloodLabel(blood) : en('profile.edit.not_set')}
            </Text>
          </PressableSurface>
          {bloodOpen ? (
            <OptionPicker
              label={en('blood.title')}
              options={BLOOD_TYPES.map((b) => ({ value: b, label: bloodLabel(b) }))}
              value={blood}
              onChange={(v) => setBlood(v as BloodType)}
            />
          ) : null}
        </GlassCard>

        <View className="gap-xs">
          <Text variant="footnote" tone="secondary" className="px-md uppercase" accessibilityRole="header">
            {en('em.title')}
          </Text>
          <GlassCard>
            <View className="min-h-choice flex-row items-center justify-between gap-md px-md">
              <Text variant="body">{en('em.name')}</Text>
              <TextInput
                value={contactName}
                onChangeText={(t) => {
                  setContactName(t);
                  setError(null);
                }}
                accessibilityLabel={en('em.name')}
                autoCapitalize="words"
                textContentType="name"
                returnKeyType="next"
                maxLength={40}
                className={`min-h-tap flex-1 text-right text-body ${TEXT_TONE.tint}`}
              />
            </View>
            <Divider />
            <View className="min-h-choice flex-row items-center justify-between gap-md px-md">
              <Text variant="body">{en('em.relation')}</Text>
              <TextInput
                value={relation}
                onChangeText={setRelation}
                accessibilityLabel={en('em.relation')}
                autoCapitalize="words"
                returnKeyType="next"
                maxLength={30}
                className={`min-h-tap flex-1 text-right text-body ${TEXT_TONE.tint}`}
              />
            </View>
            <Divider />
            <View className="min-h-choice flex-row items-center justify-between gap-md px-md">
              <Text variant="body">{en('em.phone')}</Text>
              <TextInput
                value={phone}
                // Only a Philippine number fits: digits and a leading plus, grouped as she types.
                onChangeText={(t) => {
                  setPhone(typePhPhone(t));
                  setError(null);
                }}
                onBlur={() => setPhone((p) => formatPhPhone(p) ?? p)}
                placeholder={en('em.phone.example')}
                accessibilityLabel={en('em.phone')}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="done"
                maxLength={17}
                className={`min-h-tap flex-1 text-right text-body ${TEXT_TONE.tint}`}
              />
            </View>
          </GlassCard>
          {error ? (
            <Text variant="footnote" tone="urgent" accessibilityRole="alert" className="px-md">
              {error}
            </Text>
          ) : null}
          <Text variant="footnote" tone="secondary" className="px-md">
            {en('em.footer')}
          </Text>
        </View>

        {cycleRows.length > 0 ? (
          <View className="gap-xs">
            {renderRows(cycleRows)}
            <Text variant="footnote" tone="secondary" className="px-md">
              {en('profile.cycle.footer')}
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
