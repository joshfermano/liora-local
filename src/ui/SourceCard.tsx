import { View } from 'react-native';
import type { SourceCardData } from '../content/cards';
import { Text } from './Text';
import { EDGE, SURFACE } from './theme';

// The passage is shown verbatim: no avatar, no assistant chrome.
export function SourceCard({ card }: { card: SourceCardData }) {
  return (
    <View className={`${SURFACE.surface} ${EDGE} rounded-pane p-md gap-xs`} accessible>
      <Text variant="body">{card.quote}</Text>
      <Text variant="footnote" tone="secondary">
        {card.source}
      </Text>
    </View>
  );
}
