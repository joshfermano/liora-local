import { format, parseISO } from 'date-fns';
import { View } from 'react-native';
import { en, signKey } from '../content/copy';
import type { Entry } from '../core/types';
import { Text } from './Text';

export const entryDay = (e: Entry): string => format(parseISO(e.created_at), 'yyyy-MM-dd');

// Date and decision lead, then her own words; signs are named by copy keys.
export function EntryRow({ entry }: { entry: Entry }) {
  const codes = [...new Set(entry.findings.map((f) => f.code))];
  return (
    <View className="flex-1 gap-xxs">
      <Text variant="footnote" tone="secondary">
        {`${format(parseISO(entry.created_at), 'MMM d, h:mm a')} · ${en(`glance.level.${entry.decision.level}`)}`}
      </Text>
      {entry.text ? <Text variant="body">{entry.text}</Text> : null}
      {codes.length > 0 ? (
        <Text variant="footnote" tone="secondary">
          {codes.map((c) => en(signKey(c))).join(', ')}
        </Text>
      ) : null}
    </View>
  );
}
