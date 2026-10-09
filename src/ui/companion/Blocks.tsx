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
import { GlassCard } from '../Glass';
import type { IconName } from '../Icon';
import { confirm, tap, warn } from '../haptics';
import { PressableSurface } from '../PressableSurface';
import { SourceCard } from '../SourceCard';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { SURFACE } from '../theme';
import { agentStore } from './agent-store';
import { confirmLine, savedLine } from './saved';

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

function ActionPill({ label, sf, fallback, onPress }: { label: string; sf: string; fallback: IconName; onPress: () => void }) {
  return (
    <PressableSurface label={label} onPress={onPress} surfaceClassName="min-h-tap">
      <GlassCard interactive className="min-h-tap flex-row items-center gap-xs px-md">
        <Symbol name={sf as never} fallback={fallback} tone="tint" size={18} />
        <Text variant="subheadline" tone="tint">
          {label}
        </Text>
      </GlassCard>
    </PressableSurface>
  );
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
      <View className="flex-row flex-wrap gap-xs">
        <ActionPill
          label={en('liora.period.add')}
          sf="calendar.badge.plus"
          fallback="calendar"
          onPress={() => {
            addPeriod(event, date);
            confirm();
            setState('added');
          }}
        />
        <ActionPill
          label={en('liora.period.skip')}
          sf="xmark"
          fallback="close"
          onPress={() => {
            tap();
            setState('skipped');
          }}
        />
      </View>
    </View>
  );
}

function Logged({ block }: { block: Extract<ReplyBlock, { kind: 'logged' }> }) {
  const [undone, setUndone] = useState(false);
  if (block.items.length === 0) return null;
  if (undone) return <Text variant="subheadline" tone="secondary" accessibilityLiveRegion="polite">{en('agent.undone')}</Text>;
  return (
    <GlassCard className="gap-xs p-md">
      <Text variant="footnote" tone="secondary" accessibilityRole="header">
        {en('agent.logged.title')}
      </Text>
      {block.items.map((item, i) => (
        <Text key={i} variant="body">
          {savedLine(item)}
        </Text>
      ))}
      <View className="items-start">
        <CapsuleButton
          variant="plain"
          label={en('agent.undo')}
          onPress={() => {
            tap();
            void agentStore().undo?.(block.undoId);
            setUndone(true);
          }}
        />
      </View>
    </GlassCard>
  );
}

function Confirm({ block }: { block: Extract<ReplyBlock, { kind: 'confirm' }> }) {
  const [state, setState] = useState<'ask' | 'saved' | 'skipped'>('ask');
  if (state === 'saved') return <Text variant="subheadline" tone="secondary">{en('agent.logged.title')}</Text>;
  if (state === 'skipped') return null;
  const lines = block.actions.map((a) => confirmLine(a)).filter((l): l is string => l !== null);
  if (lines.length === 0) return null;
  const answer = (yes: boolean) => {
    if (yes) confirm();
    else tap();
    void agentStore().confirm?.(block.confirmId, yes);
    setState(yes ? 'saved' : 'skipped');
  };
  return (
    <GlassCard className="gap-xs p-md">
      <Text variant="headline" accessibilityRole="header">
        {en('agent.confirm.title')}
      </Text>
      {lines.map((l, i) => (
        <Text key={i} variant="body">
          {l}
        </Text>
      ))}
      <View className="flex-row flex-wrap gap-xs pt-xxs">
        <ActionPill label={en('agent.confirm.yes')} sf="checkmark" fallback="check" onPress={() => answer(true)} />
        <ActionPill label={en('agent.confirm.no')} sf="xmark" fallback="close" onPress={() => answer(false)} />
      </View>
    </GlassCard>
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
    case 'warm':
      return (
        <Bubble>
          <Text variant="body">{block.text ?? en(`warm.${block.tone}`)}</Text>
        </Bubble>
      );
    case 'logged':
      return <Logged block={block} />;
    case 'confirm':
      return <Confirm block={block} />;
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
            <ActionPill
              key={item}
              label={en(`companion.action.${item}`)}
              sf={ACTION[item].sf}
              fallback="info"
              onPress={() => {
                tap();
                router.push(ACTION[item].href);
              }}
            />
          ))}
        </View>
      );
  }
}

