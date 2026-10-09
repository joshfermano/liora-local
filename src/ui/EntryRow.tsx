import { format, parseISO } from 'date-fns';
import { View } from 'react-native';
import { en, signKey } from '../content/copy';
import type { Entry } from '../core/types';
import { Text } from './Text';

export const entryDay = (e: Entry): string => format(parseISO(e.created_at), 'yyyy-MM-dd');

// Her own words are the title; signs are named by copy keys.
export function EntryRow({ entry }: { entry: Entry }) {
  const codes = [...new Set(entry.findings.map((f) => f.code))];
  return (
    <View className="flex-1 gap-xxs">
      <Text variant="body">{entry.text}</Text>
      {codes.length > 0 ? (
        <Text variant="footnote" tone="secondary">
          {codes.map((c) => en(signKey(c))).join(', ')}
        </Text>
      ) : null}
      <Text variant="footnote" tone="tertiary">
        {format(parseISO(entry.created_at), 'MMM d, h:mm a')}
      </Text>
    </View>
  );
}
