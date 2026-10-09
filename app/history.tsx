import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { Alert, Platform, View } from 'react-native';
import { en } from '../src/content/copy';
import { useCompanionStore, type PastChat } from '../src/store/companion';
import { confirm, tap } from '../src/ui/haptics';
import { LockGate } from '../src/ui/LockGate';
import { Divider, Section } from '../src/ui/profile/parts';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Screen } from '../src/ui/Screen';
import { Symbol } from '../src/ui/Symbol';
import { Text } from '../src/ui/Text';

const when = (iso: string) => {
  try {
    return format(parseISO(iso), 'EEE, MMM d · h:mm a');
  } catch {
    return '';
  }
};
// Clearing every past conversation cannot be undone, so it asks first.
function askToClear(clear: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${en('history.clear_all.title')}\n${en('history.clear_all.body')}`)) clear();
    return;
  }
  Alert.alert(en('history.clear_all.title'), en('history.clear_all.body'), [
    { text: en('history.clear_all.cancel'), style: 'cancel' },
    { text: en('history.clear_all.confirm'), style: 'destructive', onPress: clear },
  ]);
}

const opening = (chat: PastChat) => chat.messages.find((m) => m.role === 'her')?.text ?? '';

export default function History() {
  const router = useRouter();
  const history = useCompanionStore((s) => s.history);
  const { open, forget, clearHistory } = useCompanionStore.getState();

  return (
    <LockGate>
      <Screen raised topInset={false}>
        <View className="gap-lg pb-xl pt-xl">
          <View className="flex-row items-center justify-between">
            <Text variant="displayTitle" accessibilityRole="header" className="shrink">
              {en('history.title')}
            </Text>
            <PressableSurface label={en('daylog.done')} onPress={() => router.back()} surfaceClassName="min-h-tap min-w-tap items-end justify-center">
              <Text variant="headline" tone="tint">
                {en('daylog.done')}
              </Text>
            </PressableSurface>
          </View>

          {history.length === 0 ? (
            <Text variant="body" tone="secondary">
              {en('history.empty')}
            </Text>
          ) : (
            <Section footer={en('history.footer')}>
              {history.map((chat, i) => (
                <View key={chat.id}>
                  {i > 0 ? <Divider /> : null}
                  <View className="flex-row items-center pr-xs">
                    <PressableSurface
                      label={`${opening(chat)}, ${when(chat.startedAt)}. ${en('history.open')}`}
                      onPress={() => {
                        confirm();
                        open(chat.id);
                        router.back();
                      }}
                      pressScale={0.98}
                      className="flex-1"
                      surfaceClassName="min-h-choice justify-center gap-xxs px-md py-sm"
                    >
                      <Text variant="body" numberOfLines={2}>
                        {opening(chat)}
                      </Text>
                      <Text variant="footnote" tone="secondary">
                        {when(chat.startedAt)}
                      </Text>
                    </PressableSurface>
                    <PressableSurface
                      label={`${en('history.delete')}: ${opening(chat)}`}
                      onPress={() => {
                        tap();
                        forget(chat.id);
                      }}
                      surfaceClassName="min-h-tap min-w-tap items-center justify-center"
                    >
                      <Symbol name="trash" fallback="close" tone="secondary" size={18} />
                    </PressableSurface>
                  </View>
                </View>
              ))}
            </Section>
          )}

          {history.length > 0 ? (
            <PressableSurface
              label={en('history.clear_all')}
              onPress={() => {
                tap();
                askToClear(clearHistory);
              }}
              pressScale={0.98}
              surfaceClassName="min-h-tap items-center justify-center"
            >
              <Text variant="body" tone="urgent">
                {en('history.clear_all')}
              </Text>
            </PressableSurface>
          ) : null}
        </View>
      </Screen>
    </LockGate>
  );
}
