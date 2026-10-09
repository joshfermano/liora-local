import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CARDS } from '../../content/cards';
import { en } from '../../content/copy';
import type { QuickAction, ReplyBlock } from '../../core/companion';
import { resolvePeriodDate } from '../../core/cycle';
import { useLogStore } from '../../store/log';
import { CapsuleButton } from '../CapsuleButton';
import { Chip } from '../Chip';
import { GlassCard } from '../Glass';
import { confirm, tap, warn } from '../haptics';
import { PressableSurface } from '../PressableSurface';
import { SourceCard } from '../SourceCard';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { SURFACE } from '../theme';

const fill = (s: string, v: Record<string, string> = {}) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
const short = (s: string) => format(parseISO(s), 'MMM d');
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

const ACTION: Record<QuickAction, { href: '/checklist' | '/mood' | '/calendar'; sf: string }> = {
  checklist: { href: '/checklist', sf: 'checklist' },
  mood_check: { href: '/mood', sf: 'face.smiling' },
  calendar: { href: '/calendar', sf: 'calendar' },
  log_period: { href: '/calendar', sf: 'drop' },
};

export function Bubble({ children, her = false }: { children: React.ReactNode; her?: boolean }) {
  return (
    <View className={her ? 'items-end' : 'items-start'}>
      <View className={`max-w-[86%] rounded-pane px-md py-sm ${her ? SURFACE.tintFill : SURFACE.raised}`}>{children}</View>
    </View>
  );
}

// Same writes the calendar makes when she confirms a period.
function addPeriod(event: 'started' | 'ended', day: string) {
  const log = useLogStore.getState();
  if (event === 'started') {
    const rest = log.periods.filter((p) => p.start !== day);
    log.setPeriods([...rest, { id: `cal-${day}`, start: day, end: null, flow_by_day: {}, source: 'calendar' }]);
    return;
  }
  const target = [...log.periods].filter((p) => p.start <= day).sort((a, b) => b.start.localeCompare(a.start))[0];
  if (target) log.setPeriods(log.periods.map((p) => (p.id === target.id ? { ...p, end: day } : p)));
}

function Decision({ block }: { block: Extract<ReplyBlock, { kind: 'decision' }> }) {
  const router = useRouter();
  const open = () => router.push(`/result/${block.entryId}`);
  useEffect(() => {
    if (block.level === 'go_now') warn();
  }, [block.level]);

  if (block.level === 'go_now') {
    return (
      <View className={`${SURFACE.alarm} rounded-pane p-md gap-sm`} accessibilityRole="alert">
        <Text variant="title3" tone="onUrgent">
          {en('go.headline')}
        </Text>
        <Text variant="body" tone="onUrgent">
          {en('go.line')}
        </Text>
        <CapsuleButton variant="onAlarm" label={en('liora.go.open')} onPress={open} />
      </View>
    );
  }
  if (block.level === 'follow_up') {
    return (
      <GlassCard interactive className="p-md gap-sm">
        <CapsuleButton variant="filled" label={en('liora.followup.open')} onPress={() => { tap(); open(); }} />
      </GlassCard>
    );
  }
  return <CapsuleButton variant="plain" label={en('decided.link')} onPress={() => { tap(); router.push(`/decided/${block.entryId}`); }} />;
}

function PeriodConfirm({ block }: { block: Extract<ReplyBlock, { kind: 'period_confirm' }> }) {
  const [state, setState] = useState<'ask' | 'added' | 'skipped'>('ask');
  const date = resolvePeriodDate(block.period, ymd(new Date())) ?? block.date;
  const event = block.period.event;
  if (state === 'added') return <Text variant="subheadline" tone="secondary">{en('liora.period.added')}</Text>;
  if (state === 'skipped' || !date || (event !== 'started' && event !== 'ended')) return null;
  return (
    <View className="gap-xs">
      <Text variant="footnote" tone="secondary">
        {fill(en(event === 'started' ? 'calendar.confirm_start' : 'calendar.confirm_end'), { date: short(date) })}
      </Text>
      <View className="flex-row gap-xs">
        <Chip
          label={en('liora.period.add')}
          onPress={() => {
            addPeriod(event, date);
            confirm();
            setState('added');
          }}
        />
        <Chip label={en('liora.period.skip')} onPress={() => { tap(); setState('skipped'); }} />
      </View>
    </View>
  );
}

export function Block({ block }: { block: ReplyBlock }) {
  const router = useRouter();
  switch (block.kind) {
    case 'text':
      return (
        <Bubble>
          <Text variant="body">{fill(en(block.key), block.params)}</Text>
        </Bubble>
      );
    case 'decision':
      return <Decision block={block} />;
    case 'period_confirm':
      return <PeriodConfirm block={block} />;
    case 'mood_noted':
      return (
        <View className="flex-row flex-wrap gap-xs">
          {block.moods.map((m) => (
            <View key={m} className={`${SURFACE.tintSoft} rounded-full px-sm py-xxs`}>
              <Text variant="footnote" tone="tintSoftInk">
                {en(`feeling.${m}`)}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'cycle_answer':
      return (
        <GlassCard className="p-md gap-xxs">
          <Text variant="headline">{fill(en('calendar.next_period'), { date: short(block.prediction.next_start) })}</Text>
          <Text variant="subheadline">
            {fill(en('calendar.window'), { from: short(block.prediction.window.from), to: short(block.prediction.window.to) })}
          </Text>
          <Text variant="footnote" tone="secondary">
            {en(`calendar.basis.${block.prediction.basis}`)}. {en(`calendar.confidence.${block.prediction.confidence}`)}
          </Text>
        </GlassCard>
      );
    case 'card': {
      const card = CARDS.find((c) => c.id === block.cardId);
      return card ? <SourceCard card={card} /> : null;
    }
    case 'actions':
      return (
        <View className="flex-row flex-wrap gap-xs">
          {block.items.map((item) => (
            <PressableSurface
              key={item}
              label={en(`companion.action.${item}`)}
              onPress={() => {
                tap();
                router.push(ACTION[item].href);
              }}
              surfaceClassName="min-h-tap"
            >
              <GlassCard interactive className="min-h-tap flex-row items-center gap-xs px-md">
                <Symbol name={ACTION[item].sf as never} fallback="info" tone="tint" size={18} />
                <Text variant="subheadline" tone="tint">
                  {en(`companion.action.${item}`)}
                </Text>
              </GlassCard>
            </PressableSurface>
          ))}
        </View>
      );
  }
}

