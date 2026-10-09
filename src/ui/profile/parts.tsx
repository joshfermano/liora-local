import { useState, type ReactNode } from 'react';
import { TextInput, View } from 'react-native';
import { en } from '../../content/copy';
import { GlassCard } from '../Glass';
import { PressableSurface } from '../PressableSurface';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { SEPARATOR, TEXT_TONE } from '../theme';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-xs">
      {title ? (
        <Text variant="footnote" tone="secondary" className="px-md uppercase" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <GlassCard>{children}</GlassCard>
    </View>
  );
}

export function Divider() {
  return <View className={`ml-md h-px ${SEPARATOR}`} />;
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="min-h-choice flex-row items-center justify-between gap-md px-md">
      <Text variant="body">{label}</Text>
      {children}
    </View>
  );
}

// Saves a whole number when it is in range, clears it when empty, and says plainly when it is not.
export function NumberRow({
  label,
  unit,
  value,
  range,
  onSave,
}: {
  label: string;
  unit?: string;
  value: number | undefined;
  range: readonly [number, number];
  onSave: (n: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [error, setError] = useState(false);
  const commit = () => {
    const t = text.trim();
    if (t === '') {
      setError(false);
      return onSave(undefined);
    }
    const n = Number(t);
    if (Number.isFinite(n) && n >= range[0] && n <= range[1]) {
      setError(false);
      onSave(n);
    } else setError(true);
  };
  return (
    <View>
      <Row label={label}>
        <View className="flex-row items-center gap-xs">
          <TextInput
            value={text}
            onChangeText={setText}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            returnKeyType="done"
            accessibilityLabel={label}
            maxLength={5}
            className={`min-h-tap min-w-[64px] text-right text-body ${error ? TEXT_TONE.urgent : TEXT_TONE.tint}`}
          />
          {unit ? (
            <Text variant="body" tone="secondary">
              {unit}
            </Text>
          ) : null}
        </View>
      </Row>
      {error ? (
        <Text variant="footnote" tone="urgent" className="px-md pb-sm" accessibilityLiveRegion="polite">
          {en('profile.range').replace('{min}', String(range[0])).replace('{max}', String(range[1]))}
        </Text>
      ) : null}
    </View>
  );
}

// A tappable summary row: value with its unit, a chevron, and it opens the editor.
export function ValueRow({ label, value, unit, onPress }: { label: string; value: string | number | undefined; unit?: string; onPress: () => void }) {
  const shown = value === undefined ? en('profile.edit.not_set') : unit ? `${value} ${unit}` : String(value);
  return (
    <PressableSurface label={`${label}, ${shown}`} hint={en('profile.edit.open')} onPress={onPress} pressScale={0.98} surfaceClassName="min-h-choice flex-row items-center justify-between gap-md px-md">
      <Text variant="body">{label}</Text>
      <View className="flex-row items-center gap-xs">
        <Text variant="body" tone={value === undefined ? 'tertiary' : 'secondary'}>
          {shown}
        </Text>
        <Symbol name="chevron.right" fallback="chevronRight" tone="tertiary" size={14} />
      </View>
    </PressableSurface>
  );
}
