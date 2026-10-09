import { createAudioPlayer, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import type { OrbState } from 'orb-ui';
import { Linking, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { en } from '../src/content/copy';
import { GlassCard } from '../src/ui/Glass';
import { tap } from '../src/ui/haptics';
import { LightField } from '../src/ui/LightField';
import { useLive, type LivePhase } from '../src/ui/live/useLive';
import CloudOrb from '../src/ui/orb/CloudOrb';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Symbol } from '../src/ui/Symbol';
import { Text } from '../src/ui/Text';
import { Thinking } from '../src/ui/Thinking';
import { SURFACE, useColors } from '../src/ui/theme';

// Owned outside the screen so the closing chime outlives the screen it closes; made on first open so it is loaded by then.
let outroChime: AudioPlayer | null = null;
const outro = () => (outroChime ??= createAudioPlayer(require('../assets/sounds/live-out.wav')));

const ORB_STATE: Record<LivePhase, OrbState> = {
  starting: 'listening',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
  setup: 'listening',
  retry: 'listening',
  mic: 'listening',
};
const HINT: Partial<Record<LivePhase, string>> = {
  listening: 'live.listening',
  thinking: 'live.thinking',
  speaking: 'live.speaking',
  retry: 'live.retry',
  setup: 'liora.voice.setup',
  mic: 'voice.mic_denied',
};

// The orb starts as a seed, swells just past full size and settles; leaving reverses it.
const SEED = 0.12;
const OVERSHOOT = 1.06;
const out = Easing.out(Easing.cubic);
const inn = Easing.in(Easing.cubic);

export default function Live() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.9, 380);
  const reduce = useReducedMotion();
  const c = useColors();
  const colors = { deepColor: c.dusk, upperColor: c.tint, lowerColor: c.peach, highlightColor: c['tint-soft'], launchColor: c['tint-fill'], spinnerColor: c.tint };
  const closing = useRef(false);
  const live = useLive((href) => close(href));
  const chime = useAudioPlayer(require('../assets/sounds/live-in.wav'));

  const scale = useSharedValue(reduce ? 1 : SEED);
  const glow = useSharedValue(0);
  const chrome = useSharedValue(0);

  const chimeStatus = useAudioPlayerStatus(chime);
  const chimed = useRef(false);

  // Live is a voice space, so it speaks through the silent switch; play() before the file loads is dropped.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);
  useEffect(() => {
    outro();
  }, []);
  useEffect(() => {
    if (!chimeStatus.isLoaded || chimed.current) return;
    chimed.current = true;
    chime.play();
  }, [chimeStatus.isLoaded, chime]);

  // Recording while the chime still plays gets cut off when the chime ends, so listening waits for it.
  const listening = useRef(false);
  const startListening = live.listen;
  useEffect(() => {
    const begin = () => {
      if (listening.current) return;
      listening.current = true;
      void startListening();
    };
    if (chimeStatus.didJustFinish) begin();
    const fallback = setTimeout(begin, 2200);
    return () => clearTimeout(fallback);
  }, [chimeStatus.didJustFinish, startListening]);

  useEffect(() => {
    glow.value = withDelay(120, withTiming(1, { duration: 300 }));
    chrome.value = withDelay(reduce ? 0 : 320, withTiming(1, { duration: 280, easing: out }));
    if (!reduce) {
      scale.value = withDelay(120, withSequence(withTiming(OVERSHOOT, { duration: 560, easing: out }), withTiming(1, { duration: 240, easing: Easing.inOut(Easing.quad) })));
    }
  }, [reduce, scale, glow, chrome]);

  const close = (next?: string) => {
    if (closing.current) return;
    closing.current = true;
    tap();
    chime.pause();
    const bye = outro();
    void bye.seekTo(0).then(() => bye.play());
    const leave = () => (next ? router.replace(next as Href) : router.back());
    chrome.value = withTiming(0, { duration: 160 });
    if (reduce) {
      glow.value = withTiming(0, { duration: 200 }, (done) => {
        if (done) scheduleOnRN(leave);
      });
      return;
    }
    glow.value = withDelay(280, withTiming(0, { duration: 200 }));
    scale.value = withSequence(
      withTiming(OVERSHOOT, { duration: 120, easing: out }),
      withTiming(SEED, { duration: 360, easing: inn }, (done) => {
        if (done) scheduleOnRN(leave);
      }),
    );
  };

  const orbStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: scale.value }] }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chrome.value, transform: [{ translateY: (1 - chrome.value) * -8 }] }));

  return (
    <View className={`flex-1 ${SURFACE.ground}`}>
      <LightField />
      <View pointerEvents="box-none" className="absolute inset-0 items-center justify-center">
        <Animated.View style={orbStyle}>
          <CloudOrb
            size={size}
            colors={colors}
            state={ORB_STATE[live.phase]}
            input={live.input}
            output={live.output}
            dom={{ style: { width: size, height: size, backgroundColor: 'transparent' }, scrollEnabled: false, contentInsetAdjustmentBehavior: 'never' }}
          />
          {/* The web view swallows touches, so a clear native layer over the orb takes the tap. */}
          <PressableSurface label={en('live.orb')} hint={HINT[live.phase] ? en(HINT[live.phase]!) : undefined} onPress={live.tapOrb} pressScale={1} className="absolute inset-0" surfaceClassName="flex-1" />
        </Animated.View>
        {HINT[live.phase] ? (
          <Animated.View style={[{ top: height / 2 + size / 2 + 16 }, chromeStyle]} className="absolute inset-x-0 items-center px-xl" pointerEvents="box-none">
            <View className="items-center gap-xs">
              {live.phase === 'thinking' ? (
                <Thinking label={en('live.thinking')} />
              ) : (
                <Text variant="subheadline" tone="secondary" className="text-center" accessibilityLiveRegion="polite">
                  {en(HINT[live.phase]!)}
                </Text>
              )}
              {live.phase === 'setup' ? (
                <PressableSurface label={en('liora.voice.setup.open')} role="link" onPress={() => router.replace('/setup')} surfaceClassName="min-h-tap justify-center">
                  <Text variant="subheadline" tone="tint" className="font-semibold">
                    {en('liora.voice.setup.open')}
                  </Text>
                </PressableSurface>
              ) : null}
              {live.phase === 'mic' ? (
                <PressableSurface label={en('voice.settings')} role="link" onPress={() => void Linking.openSettings()} surfaceClassName="min-h-tap justify-center">
                  <Text variant="subheadline" tone="tint" className="font-semibold">
                    {en('voice.settings')}
                  </Text>
                </PressableSurface>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
      <Animated.View style={[{ paddingTop: insets.top + 8 }, chromeStyle]} className="flex-row items-center justify-between px-md">
        <Text variant="displayHeading" accessibilityRole="header">
          {en('liora.live')}
        </Text>
        <PressableSurface label={en('live.close')} onPress={() => close()}>
          <GlassCard interactive className="h-tap w-tap items-center justify-center">
            <Symbol name="xmark" fallback="close" tone="label" size={18} />
          </GlassCard>
        </PressableSurface>
      </Animated.View>
    </View>
  );
}
