import { View } from 'react-native';
import { en } from '../../content/copy';
import type { Discharge } from '../../core/types';
import { DISCHARGE_AMOUNTS, DISCHARGE_COLORS, DISCHARGE_SMELLS, DISCHARGE_TEXTURES } from '../../core/vocabulary';
import { Text } from '../Text';
import type { LogMarkName } from '../art';
import { Chip, type ChipSymbol } from './ChipGrid';

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

// Amount reuses the period flow's drops, so the two rows read alike.
const AMOUNT_MARK: Record<(typeof DISCHARGE_AMOUNTS)[number], LogMarkName> = {
  light: 'flow_light',
  medium: 'flow_medium',
  heavy: 'flow_heavy',
};
const TEXTURE_SYMBOL: Record<(typeof DISCHARGE_TEXTURES)[number], ChipSymbol> = {
  watery: { sf: 'drop', fallback: 'live' },
  sticky: { sf: 'scribble', fallback: 'list' },
  creamy: { sf: 'cloud', fallback: 'info' },
  egg_white: { sf: 'oval', fallback: 'info' },
  clumpy: { sf: 'circle.grid.2x2', fallback: 'list' },
};
const SMELL_SYMBOL: Record<(typeof DISCHARGE_SMELLS)[number], ChipSymbol> = {
  none: { sf: 'nose', fallback: 'check' },
  unusual: { sf: 'exclamationmark.triangle', fallback: 'danger' },
};

type Part = keyof Discharge;

function Row<T extends string>({
  part,
  options,
  value,
  onPick,
  swatch,
  mark,
  symbol,
}: {
  part: Part;
  options: readonly T[];
  value?: T;
  onPick: (v: T | undefined) => void;
  swatch?: (v: T) => string;
  mark?: (v: T) => LogMarkName;
  symbol?: (v: T) => ChipSymbol;
}) {
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
            mark={mark?.(o)}
            symbol={symbol?.(o)}
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
      <Row part="texture" options={DISCHARGE_TEXTURES} value={d.texture} onPick={(v) => set('texture', v)} symbol={(t) => TEXTURE_SYMBOL[t]} />
      <Row part="amount" options={DISCHARGE_AMOUNTS} value={d.amount} onPick={(v) => set('amount', v)} mark={(a) => AMOUNT_MARK[a]} />
      <Row part="smell" options={DISCHARGE_SMELLS} value={d.smell} onPick={(v) => set('smell', v)} symbol={(m) => SMELL_SYMBOL[m]} />
    </View>
  );
}
