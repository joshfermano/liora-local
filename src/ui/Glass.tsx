import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

const GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tint?: string;
}

// Liquid Glass where iOS has it; elsewhere the raised Capiz surface, so the layout is the same.
export function GlassCard({ children, className, style, interactive, tint }: GlassCardProps) {
  if (GLASS) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} tintColor={tint} style={[{ borderRadius: 22, overflow: 'hidden' }, style]}>
        <View className={className}>{children}</View>
      </GlassView>
    );
  }
  return (
    <View
      style={style}
      className={`overflow-hidden rounded-pane border border-separator bg-surface-raised dark:border-separator-dark dark:bg-surface-raised-dark ${className ?? ''}`}
    >
      {children}
    </View>
  );
}
