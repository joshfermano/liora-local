import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useVoiceNote } from '../../ai/use-voice-note';
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
  const thinking = useCompanionStore((s) => s.thinking);
  const voice = useVoiceNote();
  const recording = voice.state === 'recording';
  const busy = thinking || voice.state === 'transcribing';
  const canSend = text.trim().length > 0 && !busy && !recording;

  // Her words land in the input for her to read and edit before sending.
  const stopAndWrite = async () => {
    const heard = await voice.stop();
    if (heard) setText(text.trim() ? `${text.trim()} ${heard.text}` : heard.text);
  };
  useEffect(() => {
    if (recording && voice.seconds >= RECORD_LIMIT_S) void stopAndWrite();
  }, [recording, voice.seconds]);

  const toggleMic = () => {
    tap();
    if (recording) void stopAndWrite();
    else void voice.start().catch(() => {});
  };
  const send = () => {
    if (!canSend) return;
    tap();
    const t = text;
    setText('');
    void useCompanionStore.getState().send(t);
  };

  return (
    <View className="flex-row items-end gap-xs">
      <GlassCard style={{ flex: 1 }} className="flex-row items-end gap-xs p-xs">
        <PressableSurface
          label={recording ? en('home.mic.stop') : en('home.mic')}
          onPress={toggleMic}
          disabled={thinking}
          surfaceClassName={`h-tap w-tap items-center justify-center rounded-full ${recording ? SURFACE.tintFill : SURFACE.tintSoft}`}
        >
          <Symbol name={recording ? 'stop.fill' : 'mic.fill'} fallback={recording ? 'stop' : 'mic'} tone={recording ? 'onTint' : 'tint'} size={20} />
        </PressableSurface>
        <View className="flex-1 justify-center">
          {recording ? (
            <Text variant="subheadline" tone="secondary" className="px-xs" accessibilityLiveRegion="polite">
              {clock(voice.seconds)} {en('home.recording.of')} {clock(RECORD_LIMIT_S)}
            </Text>
          ) : (
            <TextInput
              multiline
              value={text}
              onChangeText={setText}
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
      </GlassCard>
      {/* Drawn, not an SF Symbol: three bars, short, long, short, are live mode's own mark. */}
      <PressableSurface label={en('liora.live')} onPress={tap} surfaceClassName={`h-[60px] w-[60px] items-center justify-center rounded-full ${SURFACE.tintFill}`}>
        <Icon name="live" tone="onTint" size={32} />
      </PressableSurface>
    </View>
  );
}
