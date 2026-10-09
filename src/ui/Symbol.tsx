import { SymbolView, type SFSymbol } from 'expo-symbols';
import { palette } from './tokens';
import { Icon, type IconName } from './Icon';
import { TONE_COLOR, useScheme, type Tone } from './theme';

interface SymbolProps {
  name: SFSymbol;
  fallback?: IconName;
  tone?: Tone;
  size?: number;
}

// SF Symbols on iOS; the drawn Icon set on the web, so nothing renders blank.
export function Symbol({ name, fallback = 'info', tone = 'label', size = 22 }: SymbolProps) {
  const color = palette[useScheme()][TONE_COLOR[tone]];
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      type="hierarchical"
      fallback={<Icon name={fallback} tone={tone} size={size} />}
    />
  );
}
