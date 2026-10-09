import { addDays, format, parseISO, subDays } from 'date-fns';
import { View } from 'react-native';
import { en } from '../../content/copy';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';
import { tap } from '../haptics';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function WeekStrip({ today, chosen, onChoose }: { today: string; chosen: string; onChoose: (d: string) => void }) {
  const recent = ymd(subDays(parseISO(today), 6));
  // A day older than the last seven (from a link) leads the strip instead of vanishing.
  const end = chosen >= recent ? parseISO(today) : addDays(parseISO(chosen), 6);
  const shown = Array.from({ length: 7 }, (_, i) => ymd(subDays(end, 6 - i)));
  return (
    <View className="flex-row" accessibilityLabel={en('daylog.days')}>
      {shown.map((d) => {
        const date = parseISO(d);
        const on = d === chosen;
        const isToday = d === today;
        return (
          <View key={d} className="flex-1 items-center">
            <PressableSurface
              label={isToday ? `${format(date, 'EEEE, MMMM d')}, ${en('cal2.key.today')}` : format(date, 'EEEE, MMMM d')}
              role="button"
              selected={on}
              onPress={() => {
                tap();
                onChoose(d);
              }}
              surfaceClassName="items-center gap-xxs py-xxs"
            >
              <Text variant="caption1" tone="secondary">
                {format(date, 'EEEEE')}
              </Text>
              <View
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  on ? 'bg-tint-fill' : ''
                } ${isToday && !on ? 'border-[1.5px] border-tint dark:border-tint-dark' : ''}`}
              >
                <Text variant="subheadline" tone={on ? 'onTint' : 'label'} className="tabular-nums">
                  {format(date, 'd')}
                </Text>
              </View>
            </PressableSurface>
          </View>
        );
      })}
    </View>
  );
}
