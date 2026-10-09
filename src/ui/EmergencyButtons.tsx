import { useRouter } from 'expo-router';
import { Linking, Platform, View } from 'react-native';
import { en } from '../content/copy';
import { dialable, useProfile } from '../store/profile';
import { CapsuleButton } from './CapsuleButton';

const fill = (s: string, name: string) => s.replace('{name}', name);
const open = (url: string) => void Linking.openURL(url).catch(() => {});

// Opens her phone's own call and message apps; the app itself sends nothing.
export function EmergencyButtons({ onAlarm = false, message = 'em.sms' }: { onAlarm?: boolean; message?: 'em.sms' | 'em.sms.crisis' }) {
  const router = useRouter();
  const { emergency } = useProfile();
  const variant = onAlarm ? 'onAlarm' : 'neutral';

  if (!emergency) {
    return <CapsuleButton variant="plain" label={en('em.add')} onPress={() => router.push('/profile-edit')} />;
  }
  const number = dialable(emergency.phone);
  const join = Platform.OS === 'android' ? '?' : '&';
  return (
    <View className="gap-sm">
      <CapsuleButton variant={variant} label={fill(en('em.call'), emergency.name)} onPress={() => open(`tel:${number}`)} />
      <CapsuleButton
        variant={variant}
        label={fill(en('em.text'), emergency.name)}
        onPress={() => open(`sms:${number}${join}body=${encodeURIComponent(en(message))}`)}
      />
    </View>
  );
}
