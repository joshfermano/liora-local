import { format, parseISO } from 'date-fns';
import { View } from 'react-native';
import { en } from '../../content/copy';
import type { CycleSpan } from '../../core/cycle';
import { GlassCard } from '../Glass';
import { Text } from '../Text';
import { SEPARATOR } from '../theme';

const MAX_ROWS = 8;

export function History({ spans }: { spans: CycleSpan[] }) {
  const rows = spans.slice(0, MAX_ROWS);
  return (
    <View className="gap-xs">
      <Text variant="title3" accessibilityRole="header">
        {en('cal.history')}
      </Text>
      <GlassCard className="px-md py-xs">
        {rows.length < 2 ? (
          <Text variant="body" tone="secondary" className="py-sm">
            {en('cal.history.empty')}
          </Text>
        ) : (
          rows.map((s, i) => (
            <View key={s.start}>
              {i > 0 ? <View className={`h-px ${SEPARATOR}`} /> : null}
              <View className="flex-row items-center justify-between py-sm min-h-tap">
                <Text variant="body">{format(parseISO(s.start), 'MMM d, yyyy')}</Text>
                <Text variant="body" tone="secondary" className="tabular-nums">
                  {s.length === null ? en('cal.history.running') : en('cal.history.days').replace('{n}', String(s.length))}
                </Text>
              </View>
            </View>
          ))
        )}
      </GlassCard>
    </View>
  );
}
