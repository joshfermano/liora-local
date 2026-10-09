import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { en } from '../src/content/copy';
import { useLogStore } from '../src/store/log';
import { confirm, tap } from '../src/ui/haptics';
import { installedVoices, Speech } from '../src/ui/live/speech';
import { premiumVoices, type VoiceInfo } from '../src/ui/live/voice';
import { mergeSetup } from '../src/ui/name';
import { Divider, Section } from '../src/ui/profile/parts';
import { PressableSurface } from '../src/ui/PressableSurface';
import { Screen } from '../src/ui/Screen';
import { Symbol } from '../src/ui/Symbol';
import { Text } from '../src/ui/Text';

const ACCENT: Record<string, string> = {
  'en-us': 'voice.accent.us',
  'en-gb': 'voice.accent.gb',
  'en-au': 'voice.accent.au',
  'en-ie': 'voice.accent.ie',
  'en-in': 'voice.accent.in',
  'en-za': 'voice.accent.za',
};

const describe = (v: VoiceInfo) => (ACCENT[v.language.toLowerCase()] ? en(ACCENT[v.language.toLowerCase()]!) : v.language);

function Choice({ label, detail, on, onPress }: { label: string; detail?: string; on: boolean; onPress: () => void }) {
  return (
    <PressableSurface label={detail ? `${label}, ${detail}` : label} role="radio" selected={on} onPress={onPress} pressScale={0.98} className="flex-1" surfaceClassName="min-h-choice flex-row items-center gap-sm px-md">
      <View className="w-5 items-center">{on ? <Symbol name="checkmark" fallback="check" tone="tint" size={16} /> : null}</View>
      <View className="flex-1 py-xs">
        <Text variant="body">{label}</Text>
        {detail ? (
          <Text variant="footnote" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </View>
    </PressableSurface>
  );
}

export default function VoiceSheet() {
  const router = useRouter();
  const chosen = useLogStore((s) => (typeof s.setup?.voice === 'string' ? s.setup.voice : undefined));
  const [voices, setVoices] = useState<VoiceInfo[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    void installedVoices(true).then((all) => setVoices(premiumVoices(all)));
    return () => void Speech?.stop();
  }, []);

  const choose = (v: VoiceInfo | null) => {
    if ((v?.identifier ?? undefined) === chosen) return;
    confirm();
    mergeSetup({ voice: v?.identifier, voiceName: v?.name });
  };

  const play = (v: VoiceInfo) => {
    tap();
    void Speech?.stop();
    setPlaying(v.identifier);
    const done = () => setPlaying((p) => (p === v.identifier ? null : p));
    Speech?.speak(en('voice.sample'), { voice: v.identifier, language: v.language, rate: 0.95, onDone: done, onStopped: done, onError: done });
  };

  return (
    <Screen raised topInset={false}>
      <View className="gap-lg pb-xl pt-xl">
        <View className="flex-row items-center justify-between">
          <Text variant="displayTitle" accessibilityRole="header" className="shrink">
            {en('voice.title')}
          </Text>
          <PressableSurface label={en('daylog.done')} onPress={() => router.back()} surfaceClassName="min-h-tap min-w-tap items-end justify-center">
            <Text variant="headline" tone="tint">
              {en('daylog.done')}
            </Text>
          </PressableSurface>
        </View>

        <Section footer={en('voice.footer')}>
          <View accessibilityRole="radiogroup" accessibilityLabel={en('voice.title')}>
            <Choice label={en('voice.auto')} detail={en('voice.auto.detail')} on={!chosen} onPress={() => choose(null)} />
            {(voices ?? []).map((v) => (
              <View key={v.identifier}>
                <Divider />
                <View className="flex-row items-center pr-xs">
                  <Choice label={v.name} detail={describe(v)} on={v.identifier === chosen} onPress={() => choose(v)} />
                  <PressableSurface label={`${en('voice.play')} ${v.name}`} onPress={() => play(v)} surfaceClassName="min-h-tap min-w-tap items-center justify-center">
                    <Symbol name={playing === v.identifier ? 'speaker.wave.3.fill' : 'speaker.wave.2'} fallback="live" tone="tint" size={20} />
                  </PressableSurface>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {voices && voices.length === 0 ? (
          <Text variant="footnote" tone="secondary" className="px-md">
            {en('voice.none')}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
