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
import { EmergencyButtons } from '../EmergencyButtons';
import { GlassCard } from '../Glass';
import type { IconName } from '../Icon';
import { confirm, tap, warn } from '../haptics';
import { PressableSurface } from '../PressableSurface';
import { SourceCard } from '../SourceCard';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { SURFACE } from '../theme';
import { Thinking } from '../Thinking';
import { agentStore } from './agent-store';
import { confirmLine, savedLine } from './saved';

const fill = (s: string, v: Record<string, string> = {}) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
const short = (s: string) => format(parseISO(s), 'MMM d');
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

const ACTION: Record<QuickAction, { href: '/checklist' | '/mood' | '/calendar' | '/profile' | '/log-day'; sf: string }> = {
  profile: { href: '/profile', sf: 'person.crop.circle' },
  log_day: { href: '/log-day', sf: 'plus.circle' },
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
        <EmergencyButtons onAlarm />
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
  const [late, setLate] = useState(false);
  if (block.items.length === 0) return null;
  if (undone) return <Text variant="subheadline" tone="secondary" accessibilityLiveRegion="polite">{en('agent.undone')}</Text>;
  return (
    <GlassCard className="gap-xxs px-md py-sm">
      <Text variant="footnote" tone="secondary" accessibilityRole="header">
        {en('agent.logged.title')}
      </Text>
      {block.items.map((item, i) => (
        <View key={i} className="flex-row items-center gap-xs">
          <Symbol name="checkmark.circle" fallback="check" tone="tint" size={16} />
          <Text variant="subheadline" className="flex-1">
            {savedLine(item)}
          </Text>
        </View>
      ))}
      {late ? null : (
        <View className="items-start">
          <CapsuleButton
            variant="plain"
            label={en('agent.undo')}
            onPress={() => {
              tap();
              if (agentStore().undo(block.undoId)) setUndone(true);
              else setLate(true);
            }}
          />
        </View>
      )}
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

// One Liora message: a single text bubble (reply, else warm, else the first text), then its attachments.
function bubbleText(blocks: ReplyBlock[]): { text: string | null; waiting: boolean } | null {
  const reply = blocks.find((b): b is Extract<ReplyBlock, { kind: 'reply' }> => b.kind === 'reply');
  if (reply) return { text: reply.text ?? fill(en(reply.fallback.key), reply.fallback.params), waiting: reply.text === null };
  const warm = blocks.find((b): b is Extract<ReplyBlock, { kind: 'warm' }> => b.kind === 'warm');
  if (warm) return { text: warm.text ?? en(`warm.${warm.tone}`), waiting: warm.text === null };
  const text = blocks.find((b): b is Extract<ReplyBlock, { kind: 'text' }> => b.kind === 'text');
  return text ? { text: fill(en(text.key), text.params), waiting: false } : null;
}

export function LioraMessage({ blocks, thinking = false }: { blocks: ReplyBlock[]; thinking?: boolean }) {
  const lead = bubbleText(blocks);
  const hasLogged = blocks.some((b) => b.kind === 'logged');
  const actions = [...new Set(blocks.flatMap((b) => (b.kind === 'actions' ? b.items : [])))];
  const rest = blocks.filter(
    (b) => b.kind !== 'reply' && b.kind !== 'warm' && b.kind !== 'text' && b.kind !== 'actions' && !(hasLogged && b.kind === 'mood_noted'),
  );
  return (
    <View className="gap-xs">
      {lead ? (
        <Bubble>
          {lead.waiting && thinking ? (
            <View className="py-xxs">
              <Thinking label={en('liora.typing')} />
            </View>
          ) : (
            <Text variant="body">{lead.text}</Text>
          )}
        </Bubble>
      ) : null}
      {rest.map((b, i) => (
        <Block key={i} block={b} />
      ))}
      {actions.length > 0 ? <Block block={{ kind: 'actions', items: actions }} /> : null}
    </View>
  );
}

export function Block({ block }: { block: ReplyBlock }) {
  const router = useRouter();
  switch (block.kind) {
    case 'text':
    case 'warm':
    case 'reply':
      return <LioraMessage blocks={[block]} />;
    case 'logged':
      return <Logged block={block} />;
    case 'confirm':
      return <Confirm block={block} />;
    case 'decision':
      return <Decision block={block} />;
    case 'period_confirm':
      return <PeriodConfirm block={block} />;
    case 'contact':
      return (
        <GlassCard className="p-md">
          <EmergencyButtons />
        </GlassCard>
      );
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
