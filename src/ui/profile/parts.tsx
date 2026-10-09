import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { en } from '../../content/copy';
import { GlassCard } from '../Glass';
import { PressableSurface } from '../PressableSurface';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { SEPARATOR } from '../theme';

// One staggered fade per group; the system Reduce Motion setting makes it a plain appearance.
export function Fade({ order, children }: { order: number; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(order * 110).reduceMotion(ReduceMotion.System)} style={{ gap: 24 }}>
      {children}
    </Animated.View>
  );
}

export function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View className="gap-xs">
      {title ? (
        <Text variant="footnote" tone="secondary" className="px-md uppercase" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <GlassCard>{children}</GlassCard>
      {footer ? (
        <Text variant="footnote" tone="secondary" className="px-md">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function Divider() {
  return <View className={`ml-md h-px ${SEPARATOR}`} />;
}

export function Row({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <View className="min-h-choice flex-row items-center justify-between gap-md px-md py-xs">
      <Text variant="body" className="shrink">
        {label}
      </Text>
      {children}
    </View>
  );
}

// Label on the left, value on the right; with onPress it is a link with a chevron.
export function ValueRow({ label, value, unit, onPress }: { label: string; value: string | number | undefined; unit?: string; onPress?: () => void }) {
  const shown = value === undefined ? en('profile.edit.not_set') : unit ? `${value} ${unit}` : String(value);
  const text = (
    <Text variant="body" tone={value === undefined ? 'tertiary' : 'secondary'}>
      {shown}
    </Text>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${label}, ${shown}`}>
        <Row label={label}>{text}</Row>
      </View>
    );
  }
  return (
    <PressableSurface label={`${label}, ${shown}`} hint={en('profile.edit.open')} onPress={onPress} pressScale={0.98} surfaceClassName="min-h-choice flex-row items-center justify-between gap-md px-md">
      <Text variant="body" className="shrink">
        {label}
      </Text>
      <View className="flex-row items-center gap-xs">
        {text}
        <Symbol name="chevron.right" fallback="chevronRight" tone="tertiary" size={14} />
      </View>
    </PressableSurface>
  );
}
