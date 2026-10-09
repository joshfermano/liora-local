import { useRouter } from 'expo-router';
import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import { en } from '../content/copy';
import { Icon } from './Icon';
import { Lattice } from './Lattice';
import { PressableSurface } from './PressableSurface';
import { Text } from './Text';

// A label on the left, its value on the right; the value wraps instead of pushing past the edge.
export function FactRow({ label, value, danger }: { label: string; value?: string; danger?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className="min-h-choice flex-row items-center justify-between gap-md px-md py-sm"
    >
      <View className="flex-1 flex-row items-center gap-sm">
        {danger ? <Icon name="danger" tone="urgent" /> : null}
        <Text variant="body" className="flex-1">
          {label}
        </Text>
      </View>
      {value ? (
        <Text variant="body" tone="secondary" className="max-w-[55%] text-right tabular-nums">
          {value}
        </Text>
      ) : null}
    </View>
  );
}

export function LinkRow({ label, href }: { label: string; href: string }) {
  const router = useRouter();
  return (
    <PressableSurface
      label={label}
      role="link"
      pressScale={0.98}
      onPress={() => router.push(href as never)}
      surfaceClassName="min-h-choice flex-row items-center justify-between gap-md px-md"
    >
      <Text variant="body" tone="tint" className="flex-1">
        {label}
      </Text>
      <Icon name="chevronRight" tone="tertiary" size={14} />
    </PressableSurface>
  );
}

// "Why?" (when a rule fired) and "How Liora decided", together in one lattice.
export function ExplainLinks({ id, ruleId }: { id: string; ruleId?: string }) {
  const rows: ReactNode[] = [];
  if (ruleId) rows.push(<LinkRow key="why" label={en('result.why')} href={`/why/${ruleId}`} />);
  rows.push(<LinkRow key="decided" label={en('decided.link')} href={`/decided/${id}`} />);
  return <Lattice>{Children.toArray(rows)}</Lattice>;
}
