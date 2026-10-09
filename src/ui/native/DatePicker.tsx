import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { createElement } from 'react';
import { Platform } from 'react-native';
import { tap } from '../haptics';
import { useColors } from '../theme';

export interface DatePickerProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  inline?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

const toInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function DatePicker({ label, value, onChange, inline, minimumDate, maximumDate }: DatePickerProps) {
  const colors = useColors();
  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'date',
      'aria-label': label,
      value: toInput(value),
      min: minimumDate ? toInput(minimumDate) : undefined,
      max: maximumDate ? toInput(maximumDate) : undefined,
      style: { minHeight: 44, fontSize: 17, padding: '0 8px', background: 'transparent', color: 'inherit' },
      onChange: (e: { target: { value: string } }) => {
        const [y, m, d] = e.target.value.split('-').map(Number);
        if (!y || !m || !d) return;
        tap();
        onChange(new Date(y, m - 1, d));
      },
    });
  }
  return (
    <DateTimePicker
      value={value}
      mode="date"
      display={inline ? 'inline' : 'compact'}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      accentColor={colors['tint-fill']}
      onValueChange={(_, date) => {
        tap();
        onChange(date);
      }}
    />
  );
}
