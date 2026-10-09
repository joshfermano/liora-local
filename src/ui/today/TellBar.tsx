import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, TextInput } from 'react-native';
import { en } from '../../content/copy';
import { useCompanionStore } from '../../store/companion';
import { agentStore } from '../companion/agent-store';
import { GlassCard } from '../Glass';
import { tap } from '../haptics';
import { PressableSurface } from '../PressableSurface';
import { Symbol } from '../Symbol';
import { SURFACE, TEXT_TONE, useColors } from '../theme';

// One line to tell Liora something; the reply is read in her tab.
export function TellBar() {
  const colors = useColors();
  const router = useRouter();
  const thinking = useCompanionStore((s) => s.thinking);
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !thinking;

  const send = () => {
    if (!canSend) return;
    tap();
    const t = text;
    setText('');
    Keyboard.dismiss();
    void agentStore().send(t);
    router.navigate('/liora');
  };

  return (
    <GlassCard className="flex-row items-center gap-xs py-xs pl-md pr-xs">
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={send}
        returnKeyType="send"
        placeholder={en('agent.tell.placeholder')}
        placeholderTextColor={colors['label-tertiary']}
        accessibilityLabel={en('agent.tell.send')}
        cursorColor={colors.tint}
        selectionColor={colors.tint}
        className={`min-h-tap flex-1 text-body ${TEXT_TONE.label}`}
        style={{ outlineStyle: 'none' } as object}
      />
      <PressableSurface
        label={en('agent.tell.send')}
        onPress={send}
        disabled={!canSend}
        surfaceClassName={`h-tap w-tap items-center justify-center rounded-full ${canSend ? SURFACE.tintFill : SURFACE.fill}`}
      >
        <Symbol name="arrow.up" fallback="chevronRight" tone={canSend ? 'onTint' : 'tertiary'} size={20} />
      </PressableSurface>
    </GlassCard>
  );
}
