import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { en, fil } from '../src/content/copy';
import { useTellStore } from '../src/store/tell';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { Icon } from '../src/ui/Icon';
import { InlineError } from '../src/ui/InlineError';
import { MicButton } from '../src/ui/MicButton';
import { Pair } from '../src/ui/Pair';
import { Screen } from '../src/ui/Screen';
import { useAiStatus, useOffline } from '../src/ui/status';
import { TellField } from '../src/ui/TellField';
import { Text } from '../src/ui/Text';

const RECORD_LIMIT_S = 30;

export default function Home() {
  const router = useRouter();
  const submit = useTellStore((s) => s.submit);
  const status = useTellStore((s) => s.status);
  const aiOn = useAiStatus((s) => s.on);
  const offline = useOffline();
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const thinking = status === 'thinking';

  // Visual only for now: recording itself arrives with FR-3.
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    if (elapsed >= RECORD_LIMIT_S) setRecording(false);
  }, [elapsed]);

  const toggleMic = () => {
    setElapsed(0);
    setRecording((r) => !r);
  };

  const check = async () => {
    const entry = await submit(text.trim());
    router.push(`/result/${entry.id}`);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <Screen>
        <View className="gap-xl pt-lg">
          <Text variant="wordmark" accessibilityRole="header">
            Liora
          </Text>
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
          </View>
          <View className="gap-xxs" accessible accessibilityLabel={[en('home.privacy'), aiOn ? en('home.ai.on') : en('home.ai.off'), offline ? en('home.offline') : ''].join('. ')}>
            <StatusRow icon="lock">{en('home.privacy')}</StatusRow>
            <StatusRow icon="info">{aiOn ? en('home.ai.on') : en('home.ai.off')}</StatusRow>
            {offline ? <StatusRow icon="phone">{en('home.offline')}</StatusRow> : null}
          </View>
          {Platform.OS === 'web' ? null : (
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
