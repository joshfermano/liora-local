import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { en } from '../../content/copy';
import { CapizMark, HeroScene, type Season } from '../art';
import { Icon } from '../Icon';
import { LightField } from '../LightField';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';
import { EDGE, SURFACE } from '../theme';
import { ChapterProgress } from './ChapterProgress';

// Hero room above, sheet below: the sheet meets the bottom of the screen and scrolls only on overflow.
export function Sheet({
  step,
  total,
  season,
  title,
  line,
  onBack,
  children,
}: {
  step: number;
  total: number;
  season: Season;
  title: string;
  line: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [room, setRoom] = useState(0);
  const hero = room > 0 ? Math.round(Math.max(room * 0.4, Math.min(room * 0.85, 240))) : 0;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className={`flex-1 ${SURFACE.ground}`}>
      <LightField />
      <View
        className="flex-1 items-center justify-center"
        style={{ paddingTop: insets.top + 8 }}
        onLayout={(e) => setRoom(e.nativeEvent.layout.height)}
      >
        {hero > 0 ? <HeroScene size={hero} season={season} /> : null}
      </View>
      {onBack ? (
        <View className="absolute left-xs" style={{ top: insets.top }}>
          <PressableSurface
            label={en('onboarding.back')}
            onPress={onBack}
            surfaceClassName="h-tap w-tap items-center justify-center rounded-full"
          >
            <Icon name="chevronLeft" tone="tint" size={24} />
          </PressableSurface>
        </View>
      ) : null}
      <View
        className={`${SURFACE.surface} ${EDGE} w-full max-w-column self-center rounded-t-sheet border-b-0`}
        style={{ maxHeight: height * 0.8 }}
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 16, gap: 16 }}
        >
          <View className="gap-xs">
            {step === 1 ? (
              <View className="flex-row items-center gap-xs pb-xxs">
                <CapizMark size={28} />
                <Text variant="wordmark">{en('onboarding.brand')}</Text>
              </View>
            ) : null}
            <Text variant="displayHeading" accessibilityRole="header">
              {title}
            </Text>
            <Text variant="body" tone="secondary">
              {line}
            </Text>
          </View>
          {children}
          <ChapterProgress step={step} total={total} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
