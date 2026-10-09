import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { format } from 'date-fns';
import { useVoiceNote } from '../../src/ai/use-voice-note';
import { en, fil } from '../../src/content/copy';
import { useLogStore } from '../../src/store/log';
import { useTellStore } from '../../src/store/tell';
import { CapsuleButton } from '../../src/ui/CapsuleButton';
import { Icon } from '../../src/ui/Icon';
import { InlineError } from '../../src/ui/InlineError';
import { MicButton } from '../../src/ui/MicButton';
import { Pair } from '../../src/ui/Pair';
import { Screen } from '../../src/ui/Screen';
import { useAiStatus, useOffline } from '../../src/ui/status';
import { TellField } from '../../src/ui/TellField';
import { useName } from '../../src/ui/name';
import { Text } from '../../src/ui/Text';
import { QuickActions, StatusCard } from '../../src/ui/today/parts';

const RECORD_LIMIT_S = 30;

export default function Home() {
  const router = useRouter();
  const submit = useTellStore((s) => s.submit);
  const status = useTellStore((s) => s.status);
  const aiOn = useAiStatus((s) => s.on);
  const setupDone = useLogStore((s) => s.setup?.status != null);
  const offline = useOffline();
  const name = useName();
  const [text, setText] = useState('');
  const voice = useVoiceNote();
  const recording = voice.state === 'recording';
  const elapsed = voice.seconds;
  const thinking = status === 'thinking' || voice.state === 'transcribing';

  // Her words land in the field for her to read and edit before Check (FR-3).
  const stopAndWrite = async () => {
    const heard = await voice.stop();
    if (heard) setText((current) => (current.trim() ? `${current.trim()} ${heard.text}` : heard.text));
  };
  useEffect(() => {
    if (recording && elapsed >= RECORD_LIMIT_S) void stopAndWrite();
  }, [recording, elapsed]);

  const toggleMic = () => {
    if (recording) void stopAndWrite();
    else void voice.start().catch(() => {});
  };

  const check = async () => {
    const entry = await submit(text.trim());
    router.push(`/result/${entry.id}`);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <Screen>
        <View className="gap-xl pt-lg">
          <View className="gap-xxs">
            <Text variant="footnote" tone="secondary" className="uppercase">
              {format(new Date(), 'EEEE, d MMMM')}
            </Text>
            <Text variant="displayTitle" accessibilityRole="header">
              {name ? en('home.greeting').replace('{name}', name) : 'Liora'}
            </Text>
          </View>
          <StatusCard />
          <View accessible accessibilityLabel={`${fil('home.prompt')} ${en('home.prompt')}`} className="gap-xxs">
            <Text variant="displayTitle">{fil('home.prompt')}</Text>
            <Text variant="body" tone="secondary">
              {en('home.prompt')}
            </Text>
          </View>
          <View className="gap-md">
            <TellField value={text} onChangeText={setText} label={en('home.field.label')} />
            <View className="flex-row items-center gap-md">
              <MicButton recording={recording} elapsed={elapsed} limit={RECORD_LIMIT_S} onPress={toggleMic} />
              <CapsuleButton
                className="flex-1"
                label={en('home.check')}
                disabled={text.trim().length === 0}
                loading={thinking}
                onPress={check}
              />
            </View>
            {status === 'error' ? <InlineError message={fil('home.error')} /> : null}
            {voice.state === 'error' && voice.error ? <InlineError message={en('home.voice.error')} /> : null}
          </View>
          <View className="gap-xxs" accessible accessibilityLabel={[en('home.privacy'), aiOn ? en('home.ai.on') : en('home.ai.off'), offline ? en('home.offline') : ''].join('. ')}>
            <StatusRow icon="lock">{en('home.privacy')}</StatusRow>
            {aiOn ? (
              <StatusRow icon="info">{en('home.ai.on')}</StatusRow>
            ) : (
              <Link href="/checklist" asChild>
                <Pressable accessibilityRole="link" accessibilityHint={en('home.checklist.hint')}>
                  <StatusRow icon="info">{en('home.ai.off')}</StatusRow>
                </Pressable>
              </Link>
            )}
            {offline ? <StatusRow icon="phone">{en('home.offline')}</StatusRow> : null}
          </View>
          <QuickActions />
          {setupDone ? null : (
            <Link href="/setup" className="self-start">
              <Text variant="footnote" tone="secondary">
                {en('home.setup')}
              </Text>
            </Link>
          )}
          {/* Test builds set EXPO_PUBLIC_SHOW_DEV=1 for on-phone measurements; the demo build leaves it off. */}
          {Platform.OS === 'web' || process.env.EXPO_PUBLIC_SHOW_DEV !== '1' ? null : (
            <Link href="/dev/native" className="self-start">
              <Text variant="footnote" tone="secondary">
                {en('home.dev_native')}
              </Text>
            </Link>
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function StatusRow({ icon, children }: { icon: 'lock' | 'info' | 'phone'; children: string }) {
  return (
    <View className="flex-row items-center gap-xs">
      <Icon name={icon} tone="secondary" size={16} />
      <Text variant="footnote" tone="secondary">
        {children}
      </Text>
    </View>
  );
}
