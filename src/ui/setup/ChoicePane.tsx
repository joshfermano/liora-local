import { View } from 'react-native';
import { Icon } from '../Icon';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';
import { EDGE, SURFACE } from '../theme';

export function ChoicePane({ label, chosen, onPress }: { label: string; chosen: boolean; onPress: () => void }) {
  return (
    <PressableSurface
      label={label}
      role="radio"
      selected={chosen}
      onPress={onPress}
      pressScale={0.98}
      surfaceClassName={`${chosen ? `${SURFACE.tintSoft} border-[1.5px] border-tint dark:border-tint-dark` : `${SURFACE.surface} ${EDGE}`} rounded-pane min-h-[60px] justify-center`}
    >
      <View className="flex-row items-center justify-between px-md py-sm">
        <Text variant="headline" tone={chosen ? 'tintSoftInk' : 'label'}>
          {label}
        </Text>
        {chosen ? <Icon name="check" tone="tint" /> : null}
      </View>
    </PressableSurface>
  );
}
