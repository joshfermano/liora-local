import { View } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import { Icon, type IconName } from '../Icon';
import { PressableSurface } from '../PressableSurface';
import { LogMark, type LogMarkName } from '../art';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { EDGE, SURFACE } from '../theme';
import { tap } from '../haptics';

export interface ChipOption<T extends string> {
  id: T;
  label: string;
  // A drawn mark, or for a colour a small swatch of it; neither leaves a plain text chip.
  mark?: LogMarkName;
  swatch?: string;
}

// An SF Symbol for a chip with no drawn mark, and the drawn icon the web shows instead.
export interface ChipSymbol {
  sf: SFSymbol;
  fallback: IconName;
}

export function Chip({
  label,
  mark,
  swatch,
  symbol,
  chosen,
  role,
  onPress,
}: {
  label: string;
  mark?: LogMarkName;
  swatch?: string;
  symbol?: ChipSymbol;
  chosen: boolean;
  role: 'checkbox' | 'radio';
  onPress: () => void;
}) {
  const tone = chosen ? 'tintSoftInk' : 'label';
  return (
    <PressableSurface
      label={label}
      role={role}
      selected={chosen}
      className="max-w-full"
      onPress={() => {
        tap();
        onPress();
      }}
      surfaceClassName={`${chosen ? SURFACE.tintSoft : SURFACE.surface} ${EDGE} rounded-full h-tap pl-md pr-sm flex-row items-center gap-xs`}
    >
      {mark ? <LogMark name={mark} chosen={chosen} size={20} /> : null}
      {swatch ? <View style={{ backgroundColor: swatch }} className={`h-4 w-4 rounded-full ${EDGE}`} /> : null}
      {symbol ? <Symbol name={symbol.sf} fallback={symbol.fallback} tone={chosen ? 'tintSoftInk' : 'secondary'} size={17} /> : null}
      <Text variant="subheadline" tone={tone} className="shrink" numberOfLines={1}>
        {label}
      </Text>
      <View className={`w-4 items-center ${chosen ? 'opacity-100' : 'opacity-0'}`}>
        <Icon name="check" tone="tintSoftInk" size={14} />
      </View>
    </PressableSurface>
  );
}

export function ChipSection<T extends string>({
  title,
  options,
  chosen,
  onToggle,
  single = false,
}: {
  title: string;
  options: ChipOption<T>[];
  chosen: T[];
  onToggle: (id: T) => void;
  single?: boolean;
}) {
  return (
    <View className="gap-xs">
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-xs">
        {options.map((o) => (
          <Chip
            key={o.id}
            label={o.label}
            mark={o.mark}
            swatch={o.swatch}
            chosen={chosen.includes(o.id)}
            role={single ? 'radio' : 'checkbox'}
            onPress={() => onToggle(o.id)}
          />
        ))}
      </View>
    </View>
  );
}
