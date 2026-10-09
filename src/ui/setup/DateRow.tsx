import { format } from 'date-fns';
import { View } from 'react-native';
import { en } from '../../content/copy';
import { DatePicker } from '../native';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';

// A lattice row with the date in words; tapping opens the system calendar beneath, so the native
// compact picker never has to fit (and clip) inside the row.
export function DateRow({
  label,
  value,
  open,
  onToggle,
  onChange,
  maximumDate,
}: {
  label: string;
  value: Date;
  open: boolean;
  onToggle: () => void;
  onChange: (date: Date) => void;
  maximumDate?: Date;
}) {
  const shown = format(value, 'MMM d, yyyy');
  return (
    <View>
      <PressableSurface
        label={`${label}, ${shown}`}
        hint={en('onboarding.date.hint')}
        onPress={onToggle}
        pressScale={0.99}
        surfaceClassName="min-h-choice flex-row items-center justify-between gap-md px-md"
      >
        <Text variant="body">{label}</Text>
        <Text variant="body" tone={open ? 'tint' : 'secondary'}>
          {shown}
        </Text>
      </PressableSurface>
      {open ? <DatePicker inline label={label} value={value} maximumDate={maximumDate} onChange={onChange} /> : null}
    </View>
  );
}
