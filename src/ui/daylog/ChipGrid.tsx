import { View } from 'react-native';
import { Icon } from '../Icon';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';
import { EDGE, SURFACE } from '../theme';
import { tap } from '../haptics';

export interface ChipOption<T extends string> {
  id: T;
  label: string;
}

function ToggleChip({ label, chosen, onPress, role }: { label: string; chosen: boolean; onPress: () => void; role: 'checkbox' | 'radio' }) {
  return (
    <PressableSurface
      label={label}
      role={role}
      selected={chosen}
      onPress={() => {
        tap();
        onPress();
      }}
      surfaceClassName={`${chosen ? SURFACE.tintSoft : SURFACE.surface} ${EDGE} rounded-full min-h-tap px-md flex-row items-center justify-center gap-xs`}
    >
      <Text variant="subheadline" tone={chosen ? 'tintSoftInk' : 'label'}>
        {label}
      </Text>
      {chosen ? <Icon name="check" tone="tintSoftInk" size={16} /> : null}
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
          <ToggleChip
            key={o.id}
            label={o.label}
            chosen={chosen.includes(o.id)}
            role={single ? 'radio' : 'checkbox'}
            onPress={() => onToggle(o.id)}
          />
        ))}
      </View>
    </View>
  );
}
