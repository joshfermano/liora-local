import { View } from 'react-native';
import { en, fil } from '../content/copy';
import { Text, type Variant } from './Text';
import type { Tone } from './theme';

// Filipino first in the larger style, English directly under it. Read together by a screen reader.
export function Pair({
  copyKey,
  large = 'title3',
  small = 'body',
  largeTone = 'label',
  smallTone = 'secondary',
}: {
  copyKey: string;
  large?: Variant;
  small?: Variant;
  largeTone?: Tone;
  smallTone?: Tone;
}) {
  const top = fil(copyKey);
  const bottom = en(copyKey);
  const same = top === bottom;
  return (
    <View accessible accessibilityLabel={same ? top : `${top}. ${bottom}`} className="gap-xxs">
      <Text variant={large} tone={largeTone} accessibilityRole="header">
        {top}
      </Text>
      {same ? null : (
        <Text variant={small} tone={smallTone}>
          {bottom}
        </Text>
      )}
    </View>
  );
}
