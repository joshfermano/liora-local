import { View } from 'react-native';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';
import { WheelPicker } from '../native';

// A lattice row: the label and her value; tapping opens the wheel beneath.
export function WheelRow({
  label,
  value,
  min,
  max,
  unit,
  open,
  onToggle,
  onChange,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  unit?: string;
  open: boolean;
  onToggle: () => void;
  onChange: (n: number) => void;
}) {
  return (
    <View>
      <PressableSurface
        label={`${label}, ${value === undefined ? '' : value}`}
        onPress={onToggle}
        pressScale={0.99}
        surfaceClassName="min-h-choice flex-row items-center justify-between gap-md px-md"
      >
        <Text variant="body">{label}</Text>
        <Text variant="body" tone={value === undefined ? 'tertiary' : 'tint'}>
          {value === undefined ? '—' : value}
        </Text>
      </PressableSurface>
      {open ? (
        <WheelPicker label={label} value={value ?? min} min={min} max={max} unit={unit} onChange={(v) => onChange(Number(v))} />
      ) : null}
    </View>
  );
}
