import { Link } from 'expo-router';
import { Platform, Text, View } from 'react-native';

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl">Liora</Text>
      {Platform.OS === 'web' ? null : (
        <Link href="/dev/native" className="mt-6 border p-3">
          <Text>Native model test</Text>
        </Link>
      )}
    </View>
  );
}
