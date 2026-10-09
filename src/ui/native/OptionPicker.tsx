import { View } from 'react-native';
import { tap } from '../haptics';
import { PressableSurface } from '../PressableSurface';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { SEPARATOR } from '../theme';

export interface OptionPickerProps {
  label: string;
  options: { label: string; value: string }[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function OptionPicker({ label, options, value, onChange }: OptionPickerProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o, i) => (
        <View key={o.value}>
          {i > 0 ? <View className={`ml-md h-px ${SEPARATOR}`} /> : null}
          <PressableSurface
            label={o.label}
            role="radio"
            selected={o.value === value}
            onPress={() => {
              if (o.value === value) return;
              tap();
              onChange(o.value);
            }}
            surfaceClassName="min-h-choice flex-row items-center justify-between px-md"
          >
            <Text variant="body">{o.label}</Text>
            {o.value === value ? <Symbol name="checkmark" fallback="check" tone="tint" size={18} /> : null}
          </PressableSurface>
        </View>
      ))}
    </View>
  );
}
