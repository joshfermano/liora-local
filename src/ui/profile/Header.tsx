import { View } from 'react-native';
import { en } from '../../content/copy';
import type { TodayModel } from '../../core/today';
import type { Profile } from '../../store/profile';
import { AvatarMark, SeasonMark, type Season } from '../art';
import { PressableSurface } from '../PressableSurface';
import { Text } from '../Text';

const fill = (key: string, n: number) => en(key).replace('{n}', String(n));

function cycleDayOf(answer: TodayModel['answer']): number | null {
  switch (answer.kind) {
    case 'period':
      return answer.day;
    case 'countdown':
    case 'any_day':
    case 'past_window':
    case 'cycle_day':
      return answer.cycleDay;
    default:
      return null;
  }
}

// Her season as a mark and one line; the parts that are unknown are left out.
export function seasonOf(profile: Profile, model: TodayModel, statedLength: number | undefined): { season: Season; line: string } {
  if (profile.status === 'pregnant') {
    return { season: 'pregnant', line: profile.weeks !== undefined ? fill('pf.pregnant_week', profile.weeks) : en('pf.pregnant') };
  }
  if (profile.status === 'postpartum') return { season: 'postpartum', line: en('pf.after_birth') };
  const day = cycleDayOf(model.answer);
  const usual = model.cycles?.length?.average ?? statedLength;
  const parts = [day !== null ? fill('pf.day', day) : null, usual !== undefined ? fill('pf.usually', usual) : null].filter(Boolean);
  return { season: model.answer.kind === 'period' ? 'period' : 'calm', line: parts.join(' · ') };
}

export function Avatar({ profile, size, onPress, label }: { profile: Profile; size: number; onPress?: () => void; label: string }) {
  const initial = (profile.name?.trim()[0] ?? 'L').toUpperCase();
  const face = profile.avatar ? (
    <AvatarMark size={size} mark={profile.avatar} />
  ) : (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center border border-nacre bg-surface-raised dark:border-nacre-dark dark:bg-surface-raised-dark"
    >
      <Text variant="displayHeading" tone="tint" accessibilityElementsHidden>
        {initial}
      </Text>
    </View>
  );
  return (
    <PressableSurface label={label} onPress={onPress} pressScale={0.96}>
      {face}
    </PressableSurface>
  );
}

export function Header({
  profile,
  season,
  line,
  onAvatar,
  onEdit,
}: {
  profile: Profile;
  season: Season;
  line: string;
  onAvatar: () => void;
  onEdit: () => void;
}) {
  return (
    <View className="flex-row items-center gap-md">
      <Avatar profile={profile} size={76} onPress={onAvatar} label={en('pf.avatar.change')} />
      <View className="flex-1 gap-xxs">
        <Text variant="displayHeading" accessibilityRole="header" numberOfLines={2}>
          {profile.name ?? en('tabs.profile')}
        </Text>
        {line ? (
          <View className="flex-row items-center gap-xs">
            <SeasonMark size={20} season={season} />
            <Text variant="subheadline" tone="secondary" className="shrink">
              {line}
            </Text>
          </View>
        ) : null}
      </View>
      <PressableSurface label={en('pf.edit')} hint={en('profile.edit.open')} onPress={onEdit} surfaceClassName="min-h-tap min-w-tap items-end justify-center">
        <Text variant="headline" tone="tint">
          {en('pf.edit')}
        </Text>
      </PressableSurface>
    </View>
  );
}
