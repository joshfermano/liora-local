import { View } from 'react-native';
import { Icon } from './Icon';
import { PressableSurface } from './PressableSurface';
import { Text } from './Text';
import { EDGE, SURFACE } from './theme';

// The check slot is always reserved so choosing never moves the label.
export function Chip({ label, chosen = false, onPress }: { label: string; chosen?: boolean; onPress?: () => void }) {
  return (
    <PressableSurface
      label={label}
      role="radio"
      selected={chosen}
      onPress={onPress}
      surfaceClassName={`${chosen ? SURFACE.tintSoft : SURFACE.surface} ${EDGE} rounded-full min-h-tap px-md flex-row items-center justify-center gap-xs`}
    >
      <Text variant="subheadline" tone={chosen ? 'tintSoftInk' : 'label'}>
        {label}
      </Text>
      <View style={{ opacity: chosen ? 1 : 0 }}>
        <Icon name="check" tone="tintSoftInk" size={16} />
      </View>
    </PressableSurface>
  );
}
