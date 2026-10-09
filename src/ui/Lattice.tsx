import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { EDGE, SEPARATOR, SURFACE } from './theme';

// The only content container: one pearl frame, panes share 1pt mullions.
export function Lattice({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <View>
      {header ? (
        <View className="px-md pb-xs">
          <Text variant="footnote" tone="secondary" accessibilityRole="header">
            {header}
          </Text>
        </View>
      ) : null}
      <View className={`${SURFACE.surface} ${EDGE} rounded-pane overflow-hidden`}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View className={`h-px ${SEPARATOR}`} /> : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? (
        <View className="px-md pt-1.5">
          <Text variant="footnote" tone="secondary">
            {footer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
