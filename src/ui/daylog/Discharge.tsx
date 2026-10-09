import { View } from 'react-native';
import { en } from '../../content/copy';
import type { Discharge } from '../../core/types';
import { DISCHARGE_AMOUNTS, DISCHARGE_COLORS, DISCHARGE_SMELLS, DISCHARGE_TEXTURES } from '../../core/vocabulary';
import { Text } from '../Text';
import { Chip } from './ChipGrid';

// How each colour looks on its chip; the words carry the meaning, the swatch only helps her find it.
const SWATCH: Record<(typeof DISCHARGE_COLORS)[number], string> = {
  clear: 'transparent',
  white: '#FFFFFF',
  yellow: '#F2D479',
  green: '#A9C48A',
  grey: '#B3ABB0',
  brown: '#93705A',
  pink: '#EBA9BC',
};

type Part = keyof Discharge;

function Row<T extends string>({ part, options, value, onPick, swatch }: { part: Part; options: readonly T[]; value?: T; onPick: (v: T | undefined) => void; swatch?: (v: T) => string }) {
  return (
    <View className="gap-xs" accessibilityRole="radiogroup" accessibilityLabel={en(`discharge.${part}`)}>
      <Text variant="footnote" tone="secondary">
        {en(`discharge.${part}`)}
      </Text>
      <View className="flex-row flex-wrap gap-xs">
        {options.map((o) => (
          <Chip
            key={o}
            label={en(`discharge.${part}.${o}`)}
            swatch={swatch?.(o)}
            chosen={value === o}
            role="radio"
            // Tapping her choice again clears it.
            onPress={() => onPick(value === o ? undefined : o)}
          />
        ))}
      </View>
    </View>
  );
}

// Discharge on a day: colour, texture, amount and smell, any of them, one choice each. Logged for her,
// not read by the danger rules.
export function DischargeSection({ value, onChange }: { value: Discharge | undefined; onChange: (next: Discharge) => void }) {
  const d = value ?? {};
  const set = (part: Part, v: string | undefined) => onChange({ ...d, [part]: v });
  return (
    <View className="gap-sm">
      <Text variant="headline" accessibilityRole="header">
        {en('daylog.discharge')}
      </Text>
      <Row part="color" options={DISCHARGE_COLORS} value={d.color} onPick={(v) => set('color', v)} swatch={(c) => SWATCH[c]} />
      <Row part="texture" options={DISCHARGE_TEXTURES} value={d.texture} onPick={(v) => set('texture', v)} />
      <Row part="amount" options={DISCHARGE_AMOUNTS} value={d.amount} onPick={(v) => set('amount', v)} />
      <Row part="smell" options={DISCHARGE_SMELLS} value={d.smell} onPick={(v) => set('smell', v)} />
    </View>
  );
}
