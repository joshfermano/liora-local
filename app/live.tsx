import { useRouter } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { en } from '../src/content/copy';
import { GlassCard } from '../src/ui/Glass';
import { tap } from '../src/ui/haptics';
import { LightField } from '../src/ui/LightField';
import { Orb } from '../src/ui/Orb';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Symbol } from '../src/ui/Symbol';
import { Text } from '../src/ui/Text';
import { SURFACE } from '../src/ui/theme';

export default function Live() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.7, 300);

  return (
    <View className={`flex-1 ${SURFACE.ground}`}>
      <LightField />
      <View className="flex-row items-center justify-between px-md" style={{ paddingTop: insets.top + 8 }}>
        <Text variant="displayHeading" accessibilityRole="header">
          {en('liora.live')}
        </Text>
        <PressableSurface
          label={en('live.close')}
          onPress={() => {
            tap();
            router.back();
          }}
        >
          <GlassCard interactive className="h-tap w-tap items-center justify-center">
            <Symbol name="xmark" fallback="close" tone="label" size={18} />
          </GlassCard>
        </PressableSurface>
      </View>
      <View className="flex-1 items-center justify-center" style={{ paddingBottom: insets.bottom + 44 }}>
        <Orb size={size} />
      </View>
    </View>
  );
}
