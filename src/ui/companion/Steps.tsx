import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { en } from '../../content/copy';
import type { Step } from '../../core/agent';
import type { IconName } from '../Icon';
import { PressableSurface } from '../PressableSurface';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { SEPARATOR } from '../theme';
import { tap } from '../haptics';
import { dayWord, savedLine } from './saved';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

function look(step: Step): { sf: string; fallback: IconName; line: string } {
  switch (step.kind) {
    case 'read':
      return { sf: 'text.bubble', fallback: 'list', line: en('agent.steps.read') };
    case 'looked':
      return { sf: 'calendar', fallback: 'calendar', line: en('agent.steps.looked') };
    case 'recalled':
      return { sf: 'brain', fallback: 'brain', line: en('agent.steps.recalled') };
    case 'undid':
      return { sf: 'arrow.uturn.backward', fallback: 'reset', line: en('agent.steps.undid') };
    case 'nothing_to_undo':
      return { sf: 'arrow.uturn.backward', fallback: 'reset', line: en('agent.steps.nothing_to_undo') };
    case 'saved': {
      const plain = ['period_deleted', 'day_cleared', 'forgot', 'name', 'status', 'remembered'].includes(step.item.kind);
      const sf = step.item.kind === 'period_deleted' || step.item.kind === 'day_cleared' || step.item.kind === 'forgot' ? 'trash' : 'square.and.pencil';
      return { sf, fallback: 'check', line: plain ? savedLine(step.item) : fill(en('agent.steps.saved'), { what: savedLine(step.item) }) };
    }
    case 'not_found':
      return { sf: 'magnifyingglass', fallback: 'info', line: en('agent.steps.not_found') };
    case 'note_not_found':
      return { sf: 'magnifyingglass', fallback: 'info', line: en('agent.steps.note_not_found') };
    case 'asked':
      return { sf: 'hand.raised', fallback: 'info', line: en('agent.steps.asked') };
    case 'day':
      return { sf: 'calendar', fallback: 'calendar', line: fill(en('agent.steps.day'), { date: dayWord(step.date).toLowerCase() }) };
    case 'cycle':
      return { sf: 'calendar.circle', fallback: 'calendar', line: en('agent.steps.cycle') };
    case 'sources':
      return { sf: 'book', fallback: 'list', line: en(step.found ? 'agent.steps.sources.found' : 'agent.steps.sources.none') };
    case 'contact':
      return { sf: 'phone', fallback: 'phone', line: en('agent.steps.contact') };
    case 'opened':
      return { sf: 'arrow.up.right', fallback: 'chevronRight', line: fill(en('agent.steps.opened'), { screen: en(`companion.action.${step.screen}`) }) };
  }
}

// What Liora's tools did this turn, folded into one quiet line until she opens it.
export function Steps({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;
  const title = steps.length === 1 ? en('agent.steps.title.one') : fill(en('agent.steps.title'), { n: String(steps.length) });
  return (
    <View className="gap-xxs">
      <PressableSurface
        label={title}
        onPress={() => {
          tap();
          setOpen((o) => !o);
        }}
        hint={en(open ? 'agent.steps.hide' : 'agent.steps.show')}
        className="self-start"
        surfaceClassName="min-h-tap flex-row items-center gap-xxs"
      >
        <Symbol name="gearshape.2" fallback="brain" tone="secondary" size={14} />
        <Text variant="footnote" tone="secondary">
          {title}
        </Text>
        <Symbol name={open ? 'chevron.up' : 'chevron.down'} fallback={open ? 'chevronLeft' : 'chevronRight'} tone="tertiary" size={11} />
      </PressableSurface>
      {open ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)} className="pb-xs pl-xxs">
          {steps.map((step, i) => {
            const { sf, fallback, line } = look(step);
            const last = i === steps.length - 1;
            return (
              <View key={i} className="flex-row gap-sm">
                <View className="w-[22px] items-center">
                  <View className="h-[22px] w-[22px] items-center justify-center">
                    <Symbol name={sf as never} fallback={fallback} tone="tint" size={14} />
                  </View>
                  {last ? null : <View className={`w-px flex-1 ${SEPARATOR}`} />}
                </View>
                <Text variant="subheadline" tone="secondary" className={`flex-1 pt-[1px] ${last ? '' : 'pb-sm'}`}>
                  {line}
                </Text>
              </View>
            );
          })}
        </Animated.View>
      ) : null}
    </View>
  );
}
