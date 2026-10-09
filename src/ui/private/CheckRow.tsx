import { View } from 'react-native';
import { Icon } from '../Icon';
import { tap } from '../haptics';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';
import { EDGE } from '../theme';

// A danger-sign row for a Lattice: the chosen state fills the pane and shows a check; its room is always reserved.
export function CheckRow({ label, chosen, onPress }: { label: string; chosen: boolean; onPress: () => void }) {
  return (
    <PressableSurface
      label={label}
      role="checkbox"
      selected={chosen}
      onPress={() => {
        tap();
        onPress();
      }}
      pressScale={0.99}
      surfaceClassName={`min-h-[60px] justify-center ${chosen ? 'bg-tint-soft dark:bg-tint-soft-dark' : ''}`}
    >
      <View className="flex-row items-center gap-sm px-md py-sm">
        <Text variant="headline" tone={chosen ? 'tintSoftInk' : 'label'} className="flex-1">
          {label}
        </Text>
        <View
          className={`h-[26px] w-[26px] items-center justify-center rounded-mark ${chosen ? 'bg-tint-fill border border-transparent' : EDGE}`}
        >
          {chosen ? <Icon name="check" tone="onTint" size={16} /> : null}
        </View>
      </View>
    </PressableSurface>
  );
}
