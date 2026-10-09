import { View } from 'react-native';
import { en } from '../content/copy';
import { Icon } from './Icon';
import { formatSize } from './setup/sizes';
import { Text } from './Text';
import { SURFACE } from './theme';

export type RowState = 'idle' | 'busy' | 'done' | 'failed' | 'web';

// One lattice row: the name, its size known up front, a slim progress line, and a check when ready.
export function SetupRow({
  name,
  state,
  written,
  total,
  expected,
}: {
  name: string;
  state: RowState;
  written: number;
  total: number;
  expected: number;
}) {
  const size = total > 0 ? total : expected;
  const fraction = state === 'done' ? 1 : state === 'busy' && size > 0 ? Math.min(1, written / size) : 0;
  const detail =
    state === 'web'
      ? en('setup.web')
      : state === 'failed'
        ? en('setup.failed')
        : state === 'done'
          ? `${formatSize(size)}, ${en('setup.done')}`
          : state === 'busy'
            ? `${formatSize(written)} / ${formatSize(size)}`
            : formatSize(size);
  return (
    <View accessible accessibilityLabel={`${name}. ${detail}`} className="gap-xs px-md py-sm">
      <View className="flex-row items-center justify-between gap-sm">
        <Text variant="headline">{name}</Text>
        {state === 'done' ? <Icon name="check" tone="tint" /> : null}
      </View>
      <View className={`h-1 overflow-hidden rounded-full ${SURFACE.fill}`}>
        <View className={`h-1 rounded-full ${SURFACE.tintFill}`} style={{ width: `${Math.round(fraction * 100)}%` }} />
      </View>
      <Text variant="footnote" tone={state === 'failed' ? 'urgent' : 'secondary'}>
        {detail}
      </Text>
    </View>
  );
}
