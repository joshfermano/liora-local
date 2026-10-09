import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { en } from '../../src/content/copy';
import { useCompanionStore } from '../../src/store/companion';
import { Bubble, LioraMessage } from '../../src/ui/companion/Blocks';
import { Composer, STARTERS } from '../../src/ui/companion/Composer';
import { GlassCard } from '../../src/ui/Glass';
import { tap } from '../../src/ui/haptics';
import { PressableSurface } from '../../src/ui/PressableSurface';
import { useFooterGap, useMargin } from '../../src/ui/Screen';
import { FadeBlur } from '../../src/ui/FadeBlur';
import { LightField } from '../../src/ui/LightField';
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

// How far each blur reaches past the header and chat bar, so messages fade rather than cut off.
const FADE = 28;

export default function Liora() {
  const messages = useCompanionStore((s) => s.messages);
  const thinking = useCompanionStore((s) => s.thinking);
  const clear = useCompanionStore((s) => s.clear);
  const hasHistory = useCompanionStore((s) => s.history.length > 0);
  const router = useRouter();
  const [text, setText] = useState('');
  const last = messages[messages.length - 1];
  const canClear = messages.length > 0 && !thinking;
  const [keyboard, setKeyboard] = useState(false);
  const insets = useSafeAreaInsets();
  const margin = useMargin();
  const footerGap = useFooterGap({ tabBar: true, keyboardUp: keyboard });
  const [headerH, setHeaderH] = useState(insets.top + 72);
  const [footerH, setFooterH] = useState(footerGap + 76);

  // Arriving on the tab, the thread fades in once; staying, typing and new replies do not replay it.
  const reduce = useReducedMotion();
  const shown = useSharedValue(reduce ? 1 : 0);
  useFocusEffect(
    useCallback(() => {
      if (reduce) return;
      shown.value = 0;
      shown.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    }, [reduce, shown]),
  );
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - shown.value) * 8 }] }));
  const curtain = useAnimatedStyle(() => ({ opacity: 1 - shown.value }));

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const scroll = useRef<ScrollView>(null);

  // A cleared chat keeps iOS's old scroll offset, which leaves the short new content out of view and the
  // screen blank, so an empty chat goes back to the top; otherwise the newest message is brought into view.
  useEffect(() => {
    if (messages.length === 0) {
      scroll.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, messages[messages.length - 1]?.blocks?.length, thinking]);

  // Back on the tab after the chat was cleared elsewhere (Done on a result): the same reset.
  useFocusEffect(
    useCallback(() => {
      if (useCompanionStore.getState().messages.length === 0) scroll.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  return (
    // The padding it adds shows through the glass keyboard, so it wears the screen's ground.
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className={`flex-1 ${SURFACE.ground}`}>
      {/* Absolute layers ignore the padding the keyboard adds, so they sit in a box that the padding shrinks. */}
      <View className="flex-1">
        <LightField />
        <Animated.ScrollView
          ref={scroll}
          style={[StyleSheet.absoluteFill, rise]}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          scrollIndicatorInsets={{ top: headerH, bottom: footerH }}
          contentContainerStyle={{ flexGrow: 1, paddingTop: headerH + 4, paddingBottom: footerH + 12, paddingHorizontal: margin }}
        >
          <View className="w-full max-w-column flex-1 self-center">
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
                      // A starter is a whole message: tapping sends it, rather than leaving it in the box.
                      onPress={() => {
                        tap();
                        void useCompanionStore.getState().send(en(k));
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
                    <LioraMessage key={m.id} blocks={m.blocks ?? []} thinking={thinking && m.id === last?.id} />
                  ),
                )}
                {thinking && last?.role !== 'liora' ? <Typing /> : null}
              </View>
            )}
          </View>
        </Animated.ScrollView>
        {/* A curtain of the ground lifts off the thread. Fading the thread itself would hide its glass:
            iOS glass and blur views do not draw while an ancestor's opacity animates. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, curtain]} className={SURFACE.ground} />
        {/* Header and chat bar float over the thread; each blur reaches a little past it so messages fade under. */}
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: -FADE }}>
            <FadeBlur edge="top" />
          </View>
          <View className="w-full max-w-column self-center" style={{ paddingTop: insets.top + 8, paddingHorizontal: margin }}>
            <View className="flex-row items-center justify-between gap-xs pb-sm pt-lg">
              <Text variant="displayTitle" accessibilityRole="header">
                {en('tabs.liora')}
              </Text>
              <View className="flex-row items-center gap-xs">
                {hasHistory ? (
                  <PressableSurface
                    label={en('liora.history')}
                    onPress={() => {
                      tap();
                      router.push('/history');
                    }}
                  >
                    <GlassCard interactive className="h-tap w-tap items-center justify-center">
                      <Symbol name="clock.arrow.circlepath" fallback="list" tone="tint" size={20} />
                    </GlassCard>
                  </PressableSurface>
                ) : null}
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
            </View>
          </View>
        </View>
        <View pointerEvents="box-none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}>
          <View pointerEvents="none" style={{ position: 'absolute', top: -FADE, left: 0, right: 0, bottom: 0 }}>
            <FadeBlur edge="bottom" />
          </View>
          <View className="w-full max-w-column self-center" style={{ paddingTop: 8, paddingHorizontal: margin, paddingBottom: footerGap }}>
            <Composer text={text} setText={setText} />
            <Text variant="caption1" tone="tertiary" className="px-xs pt-xxs">
              {en('liora.disclaimer')}
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

