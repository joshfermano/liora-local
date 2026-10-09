import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import type { CardData } from '../src/content/cards';
import { en } from '../src/content/copy';
import { readQuote } from '../src/content/quote';
import { passageLabel, SOURCES, type SourceDoc } from '../src/content/sources';
import { tap } from '../src/ui/haptics';
import { Lattice } from '../src/ui/Lattice';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Screen } from '../src/ui/Screen';
import { Symbol } from '../src/ui/Symbol';
import { Text } from '../src/ui/Text';

const FIRST = 2;

function Passage({ card }: { card: CardData }) {
  const { lead, items } = readQuote(card.quote);
  return (
    <View className="gap-xs px-md py-sm" accessible accessibilityLabel={`${passageLabel(card)}. ${[...lead, ...items].join('. ')}`}>
      <Text variant="footnote" tone="tintSoftInk" className="font-semibold">
        {passageLabel(card)}
      </Text>
      {lead.length > 0 ? (
        <View className="flex-row gap-sm">
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
      {items.map((item, i) => (
        <View key={i} className="min-h-[28px] flex-row items-center gap-sm">
          <View className="h-1.5 w-1.5 rounded-full bg-tint dark:bg-tint-dark" />
          <Text variant="body" className="flex-1">
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const usedFor = (doc: SourceDoc) =>
  [
    doc.rules.length > 0 ? en('sources.use.rules') : null,
    doc.cards.length === 1 ? en('sources.use.card') : doc.cards.length > 1 ? en('sources.use.cards').replace('{n}', String(doc.cards.length)) : null,
  ]
    .filter((part) => part !== null)
    .join(' · ');

function Doc({ doc }: { doc: SourceDoc }) {
  const [all, setAll] = useState(false);
  const shown = all ? doc.cards : doc.cards.slice(0, FIRST);
  const more = doc.cards.length > FIRST;
  const meta = doc.year === null ? doc.org : `${doc.org} · ${doc.year}`;
  const toggle = all ? en('sources.show_less') : en('sources.show_all').replace('{n}', String(doc.cards.length));

  return (
    <Lattice>
      <View className="gap-xxs px-md py-md" accessible accessibilityLabel={`${meta}. ${doc.title}. ${usedFor(doc)}`}>
        <Text variant="footnote" tone="secondary">
          {meta}
        </Text>
        <Text variant="headline">{doc.title}</Text>
        <Text variant="footnote" tone="tintSoftInk" className="font-semibold">
          {usedFor(doc)}
        </Text>
      </View>
      {shown.map((card) => (
        <Passage key={card.id} card={card} />
      ))}
      {more ? (
        <PressableSurface
          label={toggle}
          role="button"
          onPress={() => {
            tap();
            setAll((v) => !v);
          }}
          pressScale={0.98}
          surfaceClassName="min-h-tap justify-center px-md"
        >
          <Text variant="body" tone="tint">
            {toggle}
          </Text>
        </PressableSurface>
      ) : null}
      <PressableSurface
        label={`${en('sources.open')}: ${doc.title}`}
        role="link"
        onPress={() => void Linking.openURL(doc.url).catch(() => {})}
        pressScale={0.98}
        surfaceClassName="min-h-tap flex-row items-center gap-xs px-md"
      >
        <Symbol name="link" fallback="chevronRight" tone="tint" size={14} />
        <Text variant="body" tone="tint" className="flex-1">
          {en('sources.open')}
        </Text>
        <Symbol name="arrow.up.right" fallback="chevronRight" tone="tertiary" size={12} />
      </PressableSurface>
    </Lattice>
  );
}

export default function Sources() {
  const router = useRouter();
  return (
    <Screen raised topInset={false}>
      <View className="gap-lg pb-xl pt-xl">
        <View className="gap-sm">
          <View className="flex-row items-center justify-between">
            <Text variant="displayTitle" accessibilityRole="header" className="shrink">
              {en('sources.title')}
            </Text>
            <PressableSurface label={en('daylog.done')} onPress={() => router.back()} surfaceClassName="min-h-tap min-w-tap items-end justify-center">
              <Text variant="headline" tone="tint">
                {en('daylog.done')}
              </Text>
            </PressableSurface>
          </View>
          <Text variant="body" tone="secondary">
            {en('sources.intro')}
          </Text>
        </View>
        {SOURCES.map((doc) => (
          <Doc key={doc.id} doc={doc} />
        ))}
      </View>
    </Screen>
  );
}
