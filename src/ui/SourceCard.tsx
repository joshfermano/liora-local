import { Linking, View } from 'react-native';
import type { SourceCardData } from '../content/cards';
import { readQuote } from '../content/quote';
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

// The passage verbatim under the book it comes from: its lead set off as a quote, then a clean list.
// Only her tap on the source opens it, and nothing else leaves the phone.
export function SourceCard({ card }: { card: SourceCardData }) {
  // The PDF's line wraps are rejoined and a list told from its lead; the words are the source's.
  const { lead, items } = readQuote(card.quote);
  const isLink = /^https?:\/\//.test(card.source);

  return (
    <View className={`${SURFACE.surface} ${EDGE} rounded-pane overflow-hidden`}>
      <View className="flex-row items-center gap-xs px-md pb-xs pt-md" accessible accessibilityLabel={card.title}>
        <Symbol name="book.closed.fill" fallback="list" tone="tintSoftInk" size={16} />
        <Text variant="footnote" tone="tintSoftInk" className="flex-1 font-semibold">
          {card.title}
        </Text>
      </View>
      {lead.length > 0 ? (
        <View className="flex-row gap-sm px-md pb-sm pt-xs" accessible accessibilityLabel={lead.join(' ')}>
          <View className="w-[3px] rounded-full bg-tint dark:bg-tint-dark" />
          <View className="flex-1 gap-xs">
            {lead.map((line, i) => (
              <Text key={i} variant="body" className={i === 0 && lead.length > 1 ? 'font-semibold' : ''}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
      {items.length > 0 ? (
        <View className="px-md pb-sm" accessible accessibilityLabel={items.join('. ')}>
          {items.map((item, i) => (
            <View key={i}>
              {i > 0 ? <View className={`ml-[18px] h-px ${SEPARATOR}`} /> : null}
              <View className="min-h-[36px] flex-row items-center gap-sm py-xs">
                <View className="h-1.5 w-1.5 rounded-full bg-tint dark:bg-tint-dark" />
                <Text variant="body" className="flex-1">
                  {item}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
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
