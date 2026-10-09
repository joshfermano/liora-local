import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
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

function Dot({ delay }: { delay: number }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(0.3);
  useEffect(() => {
    if (reduce) return;
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0.3, { duration: 450 })), -1));
  }, [reduce, delay, v]);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={style} className="h-[8px] w-[8px] rounded-full bg-tint dark:bg-tint-dark" />;
}

function Typing() {
  return (
    <Bubble>
      <View className="flex-row items-center gap-xxs py-xxs" accessible accessibilityLabel={en('liora.typing')} accessibilityLiveRegion="polite">
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
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
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, thinking]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <Screen tabBar scroll={false} footer={<Composer text={text} setText={setText} />}>
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
              surfaceClassName="min-h-tap min-w-tap items-center justify-center"
            >
              <Symbol name="square.and.pencil" fallback="compose" tone="tint" size={22} />
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

