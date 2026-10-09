import type { ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LightField } from './LightField';
import { SURFACE } from './theme';

// 16 below 414pt wide, 20 from there (DESIGN.md Layout).
export function useMargin(): number {
  return useWindowDimensions().width >= 414 ? 20 : 16;
}

export function Screen({
  children,
  field = true,
  raised = false,
  scroll = true,
  topInset = true,
  footer,
}: {
  children: ReactNode;
  field?: boolean;
  raised?: boolean;
  scroll?: boolean;
  topInset?: boolean;
  // Pinned under the content, above the bottom inset.
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const margin = useMargin();
  const body = (
    <View
      className="w-full max-w-column self-center flex-1"
      style={{ paddingHorizontal: margin, paddingTop: topInset ? insets.top + 8 : 0 }}
    >
      {children}
    </View>
  );
  return (
    <View className={`flex-1 ${raised ? SURFACE.raised : SURFACE.ground}`}>
      {field && !raised ? <LightField /> : null}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: footer ? 0 : insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer ? (
        <View
          className="w-full max-w-column self-center"
          style={{ paddingHorizontal: margin, paddingBottom: insets.bottom + 12, paddingTop: 8 }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
