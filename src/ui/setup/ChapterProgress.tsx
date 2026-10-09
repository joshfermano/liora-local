import { View } from 'react-native';
import { en } from '../../content/copy';
import { Text } from '../Text';
import { EDGE, SURFACE } from '../theme';

export function ChapterProgress({ step, total }: { step: number; total: number }) {
  const label = en('onboarding.step').replace('{n}', String(step)).replace('{total}', String(total));
  return (
    <View accessible accessibilityLabel={label} className="flex-row items-center justify-center gap-xs">
      <View className={`${EDGE} flex-row gap-xxs rounded-sm p-xxs`}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} className={`h-[10px] w-[10px] rounded-mark ${i < step ? SURFACE.tintFill : SURFACE.fill}`} />
        ))}
      </View>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
    </View>
  );
}
