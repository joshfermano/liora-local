import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { en } from '../src/content/copy';
import { updateProfile, useProfile } from '../src/store/profile';
import { AVATAR_MARKS, AvatarMark, type AvatarMarkName } from '../src/ui/art';
import { confirm } from '../src/ui/haptics';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Screen } from '../src/ui/Screen';
import { Symbol } from '../src/ui/Symbol';
import { Text } from '../src/ui/Text';

const SIZE = 68;

export default function AvatarSheet() {
  const router = useRouter();
  const { avatar } = useProfile();

  const choose = (mark: AvatarMarkName) => {
    if (mark === avatar) return;
    confirm();
    updateProfile({ avatar: mark });
  };

  return (
    <Screen raised topInset={false}>
      <View className="gap-lg pb-xl pt-xl">
        <View className="flex-row items-center justify-between">
          <Text variant="displayTitle" accessibilityRole="header" className="shrink">
            {en('pf.avatar')}
          </Text>
          <PressableSurface label={en('daylog.done')} onPress={() => router.back()} surfaceClassName="min-h-tap min-w-tap items-end justify-center">
            <Text variant="headline" tone="tint">
              {en('daylog.done')}
            </Text>
          </PressableSurface>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-md">
          {AVATAR_MARKS.map((mark, i) => {
            const on = mark === avatar;
            return (
              <PressableSurface
                key={mark}
                label={en('pf.avatar.mark').replace('{n}', String(i + 1))}
                selected={on}
                role="radio"
                onPress={() => choose(mark)}
                className="w-[22%] items-center"
                surfaceClassName="items-center justify-center"
              >
                <View
                  style={{ width: SIZE + 8, height: SIZE + 8, borderRadius: (SIZE + 8) / 2, borderWidth: 1.5 }}
                  className={`items-center justify-center ${on ? 'border-tint dark:border-tint-dark' : 'border-transparent'}`}
                >
                  <AvatarMark size={SIZE} mark={mark} />
                </View>
                {on ? (
                  <View className="absolute -right-xxs -top-xxs h-6 w-6 items-center justify-center rounded-full bg-tint-fill">
                    <Symbol name="checkmark" fallback="check" tone="onTint" size={13} />
                  </View>
                ) : null}
              </PressableSurface>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
