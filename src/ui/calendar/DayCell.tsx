import { memo } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { en } from '../../content/copy';
import type { DayMark } from '../../core/calendar';
import { FertileLeaf } from '../art';
import { Text } from '../Text';

export const ROW_HEIGHT = 60;

interface Props {
  mark: DayMark;
  label: string;
  // Edit mode: picked days draw solid; other marks dim.
  picked: boolean;
  editing: boolean;
  onPress: (date: string) => void;
}

function DayCellBase({ mark, label, picked, editing, onPress }: Props) {
  const num = Number(mark.date.slice(8));
  const logged = editing ? picked : mark.period === 'logged';
  const dashed = editing ? !picked && mark.period !== null : mark.period === 'estimated';

  const fertile = !editing && !mark.period ? mark.fertile : null;

  let top = null;
  if (!editing) {
    if (mark.isToday) {
      top = (
        <Text variant="caption1" tone="tint" className="font-semibold">
          {en('cal2.today')}
        </Text>
      );
    } else if (mark.period && mark.periodDay !== null) {
      const filled = mark.period === 'logged';
      top = (
        <View
          className={`h-4 min-w-4 items-center justify-center rounded-full px-[3px] ${
            filled ? 'bg-tint-fill' : 'border border-tint dark:border-tint-dark'
          }`}
        >
          <Text variant="caption1" tone={filled ? 'onTint' : 'tint'} className="font-semibold">
            {mark.periodDay}
          </Text>
        </View>
      );
    } else if (mark.cycleDay !== null) {
      top = (
        <Text variant="caption1" tone="tertiary">
          {mark.cycleDay}
        </Text>
      );
    }
  }

  return (
    <Pressable
      onPress={() => onPress(mark.date)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: logged }}
      className="flex-1 items-center"
      style={{ height: ROW_HEIGHT }}
    >
      <View className="h-5 items-center justify-end">{top}</View>
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${
          mark.isToday ? 'border border-label-tertiary dark:border-label-tertiary-dark' : ''
        }`}
      >
        <View
          className={`h-8 w-8 items-center justify-center rounded-full ${
            logged
              ? 'bg-tint-fill'
              : dashed
                ? 'border-[1.5px] border-dashed border-tint dark:border-tint-dark'
                : ''
          } ${editing && !picked && mark.period ? 'opacity-50' : ''}`}
        >
          {fertile ? (
            <View className="absolute inset-0 items-center justify-center">
              <FertileLeaf size={32} filled={fertile === 'ovulation'} />
            </View>
          ) : null}
          {fertile === 'ovulation' ? (
            <RNText className="text-body text-on-fertile dark:text-on-fertile-dark">{num}</RNText>
          ) : (
            <Text variant="body" tone={logged ? 'onTint' : 'label'}>
              {num}
            </Text>
          )}
        </View>
      </View>
      <View className={`mt-[2px] h-1 w-1 rounded-full ${mark.hasLog ? 'bg-label-tertiary dark:bg-label-tertiary-dark' : ''}`} />
    </Pressable>
  );
}

export const DayCell = memo(DayCellBase);
