import { View } from 'react-native';
import type { SourceCardData } from '../content/cards';
import { Text } from './Text';
import { EDGE, SEPARATOR, SURFACE } from './theme';

// The passage is shown verbatim in a pearl pane, its source under a hairline: no avatar, no assistant chrome.
export function SourceCard({ card }: { card: SourceCardData }) {
  return (
    <View className={`${SURFACE.surface} ${EDGE} rounded-pane gap-sm p-md`} accessible>
      <Text variant="body">{card.quote}</Text>
      <View className={`h-px ${SEPARATOR}`} />
      <Text variant="footnote" tone="secondary">
        {card.source}
      </Text>
    </View>
  );
}
