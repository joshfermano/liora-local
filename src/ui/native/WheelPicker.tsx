import { Picker } from '@expo/ui/community/picker';
import { Platform, View } from 'react-native';
import { tap } from '../haptics';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';

type WheelValue = string | number;

export interface WheelPickerProps {
  label: string;
  value: WheelValue;
  onChange: (value: WheelValue) => void;
  min?: number;
  max?: number;
  options?: { label: string; value: WheelValue }[];
  unit?: string;
}

const WHEEL_HEIGHT = 160;

export function WheelPicker({ label, value, onChange, min = 0, max = 0, options, unit }: WheelPickerProps) {
  const items = options ?? Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => ({ label: String(min + i), value: min + i }));
  // The native picker can report its value as text; hand back the exact value that was offered.
  const change = (next: WheelValue | null) => {
    if (next === null) return;
    const picked = items.find((it) => String(it.value) === String(next))?.value;
    if (picked === undefined || picked === value) return;
    tap();
    onChange(picked);
  };

  if (Platform.OS === 'ios') {
    return (
      <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: `${value}${unit ? ` ${unit}` : ''}` }}>
        {/* The native wheel matches its selection as text: a number never matched, so it opened at the top. */}
        <Picker selectedValue={String(value)} onValueChange={change} style={{ height: WHEEL_HEIGHT }}>
          {items.map((it) => (
            <Picker.Item key={String(it.value)} label={it.label} value={String(it.value)} />
          ))}
        </Picker>
      </View>
    );
  }

  const index = Math.max(0, items.findIndex((it) => it.value === value));
  const step = (d: number) => {
    const next = items[index + d];
    if (next) change(next.value);
  };
  return (
    <View className="flex-row items-center justify-center gap-lg py-sm">
      <PressableSurface label={`${label}: previous`} onPress={() => step(-1)} disabled={index === 0} surfaceClassName="h-tap w-tap items-center justify-center rounded-full">
        <Text variant="displayTitle" tone="tint">−</Text>
      </PressableSurface>
      <Text variant="displayTitle" accessibilityLabel={label} accessibilityLiveRegion="polite">
        {items[index]?.label ?? ''}
      </Text>
      <PressableSurface label={`${label}: next`} onPress={() => step(1)} disabled={index === items.length - 1} surfaceClassName="h-tap w-tap items-center justify-center rounded-full">
        <Text variant="displayTitle" tone="tint">+</Text>
      </PressableSurface>
    </View>
  );
}
