import { SegmentedControl as NativeSegments } from '@expo/ui/community/segmented-control';
import { Platform, View } from 'react-native';
import { tap } from '../haptics';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';

export interface SegmentedControlProps {
  label: string;
  options: { label: string; value: string }[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function SegmentedControl({ label, options, value, onChange }: SegmentedControlProps) {
  const selectedIndex = options.findIndex((o) => o.value === value);
  const pick = (v: string) => {
    if (v === value) return;
    tap();
    onChange(v);
  };

  if (Platform.OS === 'ios') {
    return (
      <View accessibilityLabel={label}>
        <NativeSegments
          values={options.map((o) => o.label)}
          selectedIndex={selectedIndex < 0 ? undefined : selectedIndex}
          onValueChange={(text) => {
            const hit = options.find((o) => o.label === text);
            if (hit) pick(hit.value);
          }}
        />
      </View>
    );
  }

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row gap-xs p-xs">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableSurface
            key={o.value}
            label={o.label}
            role="radio"
            selected={on}
            onPress={() => pick(o.value)}
            className="flex-1"
            surfaceClassName={`min-h-tap items-center justify-center rounded-full px-xs ${on ? 'bg-tint-fill' : ''}`}
          >
            <Text variant="footnote" tone={on ? 'onTint' : 'label'} className="text-center">
              {o.label}
            </Text>
          </PressableSurface>
        );
      })}
    </View>
  );
}
