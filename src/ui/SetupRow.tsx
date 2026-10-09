import { View } from 'react-native';
import { Text } from './Text';
import { EDGE, SURFACE } from './theme';

export type RowState = 'idle' | 'busy' | 'done' | 'failed' | 'web';

const SQUARES = 10;

// Real megabytes from the download plus ten squares; never a bare percentage.
export function SetupRow({
  name,
  state,
  written,
  total,
  status,
}: {
  name: string;
  state: RowState;
  written: number;
  total: number;
  status: string;
}) {
  const lit = state === 'done' ? SQUARES : total > 0 ? Math.floor((written / total) * SQUARES) : 0;
  const mb = (n: number) => Math.round(n / 1_000_000);
  const detail =
    state === 'busy' || state === 'done' ? `${mb(written)}${total > 0 ? ` / ${mb(total)}` : ''} ${status}` : status;
  return (
    <View
      accessible
      accessibilityLabel={`${name}. ${detail}`}
      className={`${SURFACE.surface} ${EDGE} rounded-pane px-md py-sm gap-xs`}
    >
      <Text variant="headline">{name}</Text>
      <View className="flex-row gap-xxs">
        {Array.from({ length: SQUARES }, (_, i) => (
          <View key={i} className={`h-3 flex-1 rounded-sm ${i < lit ? SURFACE.tintFill : SURFACE.fill}`} />
        ))}
      </View>
      <Text variant="footnote" tone={state === 'failed' ? 'urgent' : 'secondary'}>
        {detail}
      </Text>
    </View>
  );
}
