import type { ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LightField } from './LightField';
import { SURFACE } from './theme';

// 16 below 414pt wide, 20 from there (DESIGN.md Layout).
export function useMargin(): number {
  return useWindowDimensions().width >= 414 ? 20 : 16;
}

const TAB_BAR_CLEARANCE = 64;

// The space under a pinned footer: beside the tab bar it tucks into the bar's generous clearance; over
// the keyboard it sits right on it.
export function useFooterGap({ tabBar = false, keyboardUp = false }: { tabBar?: boolean; keyboardUp?: boolean }): number {
  const insets = useSafeAreaInsets();
  const bottom = keyboardUp ? 0 : insets.bottom + (tabBar ? TAB_BAR_CLEARANCE : 0);
  return tabBar && !keyboardUp ? bottom - 8 : bottom + 12;
}

export function Screen({
  children,
  field = true,
  raised = false,
  scroll = true,
  topInset = true,
  tabBar = false,
  keyboardUp = false,
  footer,
}: {
  children: ReactNode;
  field?: boolean;
  raised?: boolean;
  scroll?: boolean;
  topInset?: boolean;
  // Tab screens keep their last content and footer clear of the floating tab bar.
  tabBar?: boolean;
  // The keyboard covers the tab bar and the home indicator, so the footer sits right on it.
  keyboardUp?: boolean;
  // Pinned under the content, above the bottom inset.
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const margin = useMargin();
  const bottom = keyboardUp ? 0 : insets.bottom + (tabBar ? TAB_BAR_CLEARANCE : 0);
  const footerGap = useFooterGap({ tabBar, keyboardUp });
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: footer ? 0 : bottom + 24 }}
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
          style={{ paddingHorizontal: margin, paddingBottom: footerGap, paddingTop: 8 }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
