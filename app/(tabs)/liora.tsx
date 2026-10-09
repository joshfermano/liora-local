import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { en } from '../../src/content/copy';
import { useCompanionStore } from '../../src/store/companion';
import { Block, Bubble } from '../../src/ui/companion/Blocks';
import { Composer, STARTERS } from '../../src/ui/companion/Composer';
import { GlassCard } from '../../src/ui/Glass';
import { tap } from '../../src/ui/haptics';
import { PressableSurface } from '../../src/ui/PressableSurface';
import { Screen } from '../../src/ui/Screen';
import { Symbol } from '../../src/ui/Symbol';
import { Text } from '../../src/ui/Text';
import { Thinking } from '../../src/ui/Thinking';
import { SURFACE } from '../../src/ui/theme';

function Typing() {
  return (
    <Bubble>
      <View className="py-xxs">
        <Thinking label={en('liora.typing')} />
      </View>
    </Bubble>
  );
}

export default function Liora() {
  const messages = useCompanionStore((s) => s.messages);
  const thinking = useCompanionStore((s) => s.thinking);
  const clear = useCompanionStore((s) => s.clear);
  const [text, setText] = useState('');
  const canClear = messages.length > 0 && !thinking;
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, thinking]);

  return (
    // The padding it adds shows through the glass keyboard, so it wears the screen's ground.
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className={`flex-1 ${SURFACE.ground}`}>
      <Screen tabBar keyboardUp={keyboard} scroll={false} footer={<Composer text={text} setText={setText} />}>
        <View className="flex-row items-center justify-between gap-xs pb-sm pt-lg">
          <Text variant="displayTitle" accessibilityRole="header">
            {en('tabs.liora')}
          </Text>
          {canClear ? (
            <PressableSurface
              label={en('liora.clear')}
              onPress={() => {
                tap();
                clear();
              }}
            >
              <GlassCard interactive className="h-tap w-tap items-center justify-center">
                <Symbol name="arrow.counterclockwise" fallback="reset" tone="tint" size={20} />
              </GlassCard>
            </PressableSurface>
          ) : null}
        </View>
        <ScrollView ref={scroll} className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}>
          {messages.length === 0 && !thinking ? (
            <View className="flex-1 justify-center gap-lg py-xl">
              <View className="gap-xs">
                <Text variant="displayHeading" accessibilityRole="header">
                  {en('liora.empty.title')}
                </Text>
                <Text variant="body" tone="secondary">
                  {en('liora.empty.body')}
                </Text>
              </View>
              <View className="gap-xs">
                {STARTERS.map((k) => (
                  <PressableSurface
                    key={k}
                    label={en(k)}
                    onPress={() => {
                      tap();
                      setText(en(k));
                    }}
                    pressScale={0.98}
                    className="self-start"
                  >
                    <GlassCard interactive className="min-h-tap justify-center px-md">
                      <Text variant="body">{en(k)}</Text>
                    </GlassCard>
                  </PressableSurface>
                ))}
              </View>
            </View>
          ) : (
            <View className="gap-sm pt-xs">
              {messages.map((m) =>
                m.role === 'her' ? (
                  <Bubble key={m.id} her>
                    <Text variant="body" tone="onTint">
                      {m.text}
                    </Text>
                  </Bubble>
                ) : (
                  <View key={m.id} className="gap-xs">
                    {(m.blocks ?? []).map((b, i) => (
                      <Block key={i} block={b} />
                    ))}
                  </View>
                ),
              )}
              {thinking ? <Typing /> : null}
            </View>
          )}
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

