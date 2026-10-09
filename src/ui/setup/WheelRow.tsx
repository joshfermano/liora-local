import { View } from 'react-native';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';
import { WheelPicker } from '../native';
import { en } from '../../content/copy';

// A lattice row: the label and her value; tapping opens the wheel beneath.
export function WheelRow({
  label,
  value,
  min,
  max,
  unit,
  start,
  open,
  onToggle,
  onChange,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  unit?: string;
  // Where the wheel opens when nothing is set yet; nothing is saved until she picks.
  start?: number;
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
        <Text variant="body" tone={value === undefined ? 'tertiary' : open ? 'tint' : 'secondary'}>
          {value === undefined ? en('profile.edit.not_set') : unit ? `${value} ${unit}` : String(value)}
        </Text>
      </PressableSurface>
      {open ? (
        <WheelPicker label={label} value={value ?? start ?? min} min={min} max={max} unit={unit} onChange={(v) => onChange(Number(v))} />
      ) : null}
    </View>
  );
}
