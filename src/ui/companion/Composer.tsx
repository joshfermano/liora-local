import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, TextInput, View } from 'react-native';
import { modelBytesOnDisk, voiceBytesOnDisk } from '../../ai/gemma-native';
import { MIC_DENIED, useVoiceNote } from '../../ai/use-voice-note';
import { en } from '../../content/copy';
import { useCompanionStore } from '../../store/companion';
import { GlassCard } from '../Glass';
import { Icon } from '../Icon';
import { tap } from '../haptics';
import { PressableSurface } from '../PressableSurface';
import { clock } from '../MicButton';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { SURFACE, TEXT_TONE, useColors } from '../theme';

const RECORD_LIMIT_S = 30;

export const STARTERS = ['liora.starter.1', 'liora.starter.2', 'liora.starter.3'] as const;

export function Composer({ text, setText }: { text: string; setText: (t: string) => void }) {
  const colors = useColors();
  const router = useRouter();
  const thinking = useCompanionStore((s) => s.thinking);
  const voice = useVoiceNote();
  const recording = voice.state === 'recording';
  const busy = thinking || voice.state === 'transcribing';
  const canSend = text.trim().length > 0 && !busy && !recording;

  const transcribing = voice.state === 'transcribing';
  const [notice, setNotice] = useState<'setup' | 'error' | 'mic' | null>(null);

  // Her words land in the input for her to read and edit before sending.
  const stopAndWrite = async () => {
    const heard = await voice.stop();
    if (heard) setText(text.trim() ? `${text.trim()} ${heard.text}` : heard.text);
    else setNotice('error');
  };
  useEffect(() => {
    if (recording && voice.seconds >= RECORD_LIMIT_S) void stopAndWrite();
  }, [recording, voice.seconds]);

  // Recording without Gemma and its voice add-on on the phone would only end in a silent failure.
  const toggleMic = () => {
    tap();
    if (recording) return void stopAndWrite();
    if (modelBytesOnDisk() <= 0 || voiceBytesOnDisk() <= 0) return setNotice('setup');
    setNotice(null);
    void voice.start().catch((e: unknown) => setNotice(e instanceof Error && e.message === MIC_DENIED ? 'mic' : 'error'));
  };
  const send = () => {
    if (!canSend) return;
    tap();
    const t = text;
    setText('');
    void useCompanionStore.getState().send(t);
  };

  // Live is offered only while the box is empty; once she types, sending is the action.
  const showLive = text.trim().length === 0 && !recording && !transcribing;

  return (
    <View className="gap-xs">
      {notice ? (
        <View className="flex-row flex-wrap items-center gap-x-xs px-xs" accessibilityRole="alert">
          <Text variant="footnote" tone="secondary">
            {en(notice === 'setup' ? 'liora.voice.setup' : notice === 'mic' ? 'voice.mic_denied' : 'home.voice.error')}
          </Text>
          {notice === 'setup' ? (
            <PressableSurface label={en('liora.voice.setup.open')} role="link" onPress={() => router.push('/setup')} surfaceClassName="min-h-tap justify-center">
              <Text variant="footnote" tone="tint" className="font-semibold">
                {en('liora.voice.setup.open')}
              </Text>
            </PressableSurface>
          ) : null}
          {notice === 'mic' ? (
            <PressableSurface label={en('voice.settings')} role="link" onPress={() => void Linking.openSettings()} surfaceClassName="min-h-tap justify-center">
              <Text variant="footnote" tone="tint" className="font-semibold">
                {en('voice.settings')}
              </Text>
            </PressableSurface>
          ) : null}
        </View>
      ) : null}
      <GlassCard className="flex-row items-end gap-xs p-xs">
        <PressableSurface
          label={recording ? en('home.mic.stop') : en('home.mic')}
          onPress={toggleMic}
          disabled={thinking || transcribing}
          surfaceClassName={`h-tap w-tap items-center justify-center rounded-full ${recording ? SURFACE.tintFill : SURFACE.tintSoft}`}
        >
          <Symbol name={recording ? 'stop.fill' : 'mic.fill'} fallback={recording ? 'stop' : 'mic'} tone={recording ? 'onTint' : 'tint'} size={20} />
        </PressableSurface>
        <View className="flex-1 justify-center">
          {transcribing ? (
            <Text variant="subheadline" tone="secondary" className="px-xs" accessibilityLiveRegion="polite">
              {en('liora.voice.writing')}
            </Text>
          ) : recording ? (
            <Text variant="subheadline" tone="secondary" className="px-xs" accessibilityLiveRegion="polite">
              {clock(voice.seconds)} {en('home.recording.of')} {clock(RECORD_LIMIT_S)}
            </Text>
          ) : (
            <TextInput
              multiline
              value={text}
              onChangeText={(t) => {
                setNotice(null);
                setText(t);
              }}
              accessibilityLabel={en('liora.placeholder')}
              cursorColor={colors.tint}
              selectionColor={colors.tint}
              className={`max-h-[120px] min-h-tap px-xs py-sm text-body ${TEXT_TONE.label}`}
              style={{ outlineStyle: 'none' } as object}
            />
          )}
        </View>
        <PressableSurface
          label={en('liora.send')}
          onPress={send}
          disabled={!canSend}
          surfaceClassName={`h-tap w-tap items-center justify-center rounded-full ${canSend ? SURFACE.tintFill : SURFACE.fill}`}
        >
          <Symbol name="arrow.up" fallback="chevronRight" tone={canSend ? 'onTint' : 'tertiary'} size={20} />
        </PressableSurface>
        {showLive ? (
          // Drawn, not an SF Symbol: three bars, short, long, short, are live mode's own mark.
          <PressableSurface
            label={en('liora.live')}
            onPress={() => {
              tap();
              router.push('/live');
            }}
            surfaceClassName={`h-tap w-tap items-center justify-center rounded-full ${SURFACE.tintFill}`}
          >
            <Icon name="live" tone="onTint" size={22} />
          </PressableSurface>
        ) : null}
      </GlassCard>
    </View>
  );
}
