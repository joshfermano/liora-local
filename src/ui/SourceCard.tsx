import { Linking, View } from 'react-native';
import type { SourceCardData } from '../content/cards';
import { PressableSurface } from './PressableSurface';
import { Symbol } from './Symbol';
import { Text } from './Text';
import { EDGE, SEPARATOR, SURFACE } from './theme';

const siteOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// The passage verbatim, set off as a quote under the book it comes from; a list keeps one line per row.
// Only her tap on the source opens it, and nothing else leaves the phone.
export function SourceCard({ card }: { card: SourceCardData }) {
  const lines = card.quote
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const isLink = /^https?:\/\//.test(card.source);

  return (
    <View className={`${SURFACE.surface} ${EDGE} rounded-pane overflow-hidden`}>
      <View className="flex-row items-center gap-xs px-md pb-xs pt-md" accessible accessibilityLabel={card.title}>
        <Symbol name="book.closed.fill" fallback="list" tone="tintSoftInk" size={16} />
        <Text variant="footnote" tone="tintSoftInk" className="flex-1 font-semibold">
          {card.title}
        </Text>
      </View>
      <View className="flex-row gap-sm px-md pb-md pt-xs" accessible accessibilityLabel={lines.join('. ')}>
        <View className="w-[3px] rounded-full bg-tint dark:bg-tint-dark" />
        <View className="flex-1 gap-xs">
          {lines.length > 1 ? (
            lines.map((line, i) => (
              <View key={i} className="flex-row gap-xs">
                <View className="pt-[9px]">
                  <View className="h-1.5 w-1.5 rounded-full bg-tint dark:bg-tint-dark" />
                </View>
                <Text variant="body" className="flex-1">
                  {line}
                </Text>
              </View>
            ))
          ) : (
            <Text variant="body">{lines[0] ?? card.quote}</Text>
          )}
        </View>
      </View>
      <View className={`h-px ${SEPARATOR}`} />
      {isLink ? (
        <PressableSurface
          label={`${card.title}, ${siteOf(card.source)}`}
          role="link"
          onPress={() => void Linking.openURL(card.source).catch(() => {})}
          surfaceClassName="min-h-tap flex-row items-center gap-xs px-md"
        >
          <Symbol name="link" fallback="chevronRight" tone="secondary" size={14} />
          <Text variant="footnote" tone="secondary" className="flex-1">
            {siteOf(card.source)}
          </Text>
          <Symbol name="arrow.up.right" fallback="chevronRight" tone="tertiary" size={12} />
        </PressableSurface>
      ) : (
        <View className="min-h-tap justify-center px-md">
          <Text variant="footnote" tone="secondary">
            {card.source}
          </Text>
        </View>
      )}
    </View>
  );
}
