import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { en } from '../content/copy';
import { CapsuleButton } from './CapsuleButton';

export function DecidedLink({ id }: { id: string }) {
  const router = useRouter();
  return (
    <View className="self-start">
      <CapsuleButton variant="plain" label={en('decided.link')} onPress={() => router.push(`/decided/${id}`)} />
    </View>
  );
}
