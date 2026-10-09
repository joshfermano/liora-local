import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { bootGemma } from '../src/ai/gemma-boot';
import { downloadEmbedder, embedderBytesOnDisk } from '../src/ai/embedder';
import { downloadModel, downloadVoice, modelBytesOnDisk, voiceBytesOnDisk } from '../src/ai/gemma-native';
import { gemmaSession } from '../src/ai/gemma-session';
import { en } from '../src/content/copy';
import type { Context } from '../src/core/types';
import { useLogStore } from '../src/store/log';
import { useTellStore } from '../src/store/tell';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { ChoiceCard } from '../src/ui/ChoiceCard';
import { InlineError } from '../src/ui/InlineError';
import { Screen } from '../src/ui/Screen';
import { SetupRow, type RowState } from '../src/ui/SetupRow';
import { useAiStatus } from '../src/ui/status';
import { Text } from '../src/ui/Text';
import { EDGE, SURFACE, TEXT_TONE } from '../src/ui/theme';

type Status = Context['status'];
interface Progress {
  state: RowState;
  written: number;
  total: number;
}

const web = Platform.OS === 'web';
const initial = (bytes: number): Progress =>
  web
    ? { state: 'web', written: 0, total: 0 }
    : bytes > 0
      ? { state: 'done', written: bytes, total: bytes }
      : { state: 'idle', written: 0, total: 0 };

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (t: string) => void }) {
  return (
    <View className="gap-xxs">
      <Text variant="subheadline" tone="secondary">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        accessibilityLabel={label}
        keyboardType="numbers-and-punctuation"
        className={`${SURFACE.surface} ${EDGE} rounded-pane min-h-tap px-md text-body ${TEXT_TONE.label}`}
      />
    </View>
  );
}

function rowStatus(p: Progress): string {
  if (p.state === 'web') return en('setup.web');
  if (p.state === 'failed') return en('setup.failed');
  if (p.state === 'done') return `${en('setup.mb')}, ${en('setup.done')}`;
  return en('setup.mb');
}

export default function Setup() {
  const router = useRouter();
  const [model, setModel] = useState<Progress>(() => initial(modelBytesOnDisk()));
  const [voice, setVoice] = useState<Progress>(() => initial(voiceBytesOnDisk()));
  const [cards, setCards] = useState<Progress>(() => initial(embedderBytesOnDisk()));
  const [status, setStatus] = useState<Status | null>(null);
  const [weeks, setWeeks] = useState('');
  const [days, setDays] = useState('');
  const [lastPeriod, setLastPeriod] = useState('');
  const [cycle, setCycle] = useState('');
  const [invalid, setInvalid] = useState(false);

  const busy = model.state === 'busy' || voice.state === 'busy';
  const needsDownload = !web && (model.state !== 'done' || voice.state !== 'done');

  const run = async (
    download: (cb: (w: number, t: number) => void) => Promise<void>,
    set: (p: Progress) => void,
    bytes: () => number,
  ) => {
    set({ state: 'busy', written: 0, total: 0 });
    try {
      await download((written, total) => set({ state: 'busy', written, total }));
      const done = bytes();
      set({ state: 'done', written: done, total: done });
    } catch {
      set({ state: 'failed', written: 0, total: 0 });
    }
  };

  const start = async () => {
    if (model.state !== 'done') await run(downloadModel, setModel, modelBytesOnDisk);
    if (voice.state !== 'done') await run(downloadVoice, setVoice, voiceBytesOnDisk);
    if (cards.state !== 'done') await run(downloadEmbedder, setCards, embedderBytesOnDisk);
    if (!bootGemma()) return;
    const { setOn } = useAiStatus.getState();
    gemmaSession().then(
      () => setOn(true),
      () => setOn(false),
    );
  };

  const whole = (t: string, min: number, max: number) => {
    const n = Number(t);
    return /^\d+$/.test(t) && n >= min && n <= max ? n : null;
  };

  const save = () => {
    const log = useLogStore.getState();
    if (status === 'pregnant') {
      const w = whole(weeks, 1, 45);
      if (w === null) return setInvalid(true);
      useTellStore.getState().setContext({ status, weeks: w });
      log.setSetup({ status, weeks: w });
    } else if (status === 'postpartum') {
      const d = whole(days, 0, 365);
      if (d === null) return setInvalid(true);
      useTellStore.getState().setContext({ status, days_since_birth: d });
      log.setSetup({ status, days_since_birth: d });
    } else if (status === 'neither') {
      const len = whole(cycle, 15, 90);
      const okDate = /^\d{4}-\d{2}-\d{2}$/.test(lastPeriod) && !Number.isNaN(Date.parse(lastPeriod));
      if (len === null || !okDate) return setInvalid(true);
      useTellStore.getState().setContext({ status });
      log.setSetup({ status, last_period_start: lastPeriod, cycle_length: len });
      log.setPeriods([{ id: `setup-${lastPeriod}`, start: lastPeriod, end: null, flow_by_day: {}, source: 'setup' }]);
      log.setCycleSettings({ ...log.cycleSettings, stated_cycle_length: len });
    }
    router.replace('/');
  };

  const choose = (s: Status) => {
    setStatus(s);
    setInvalid(false);
  };

  return (
    <Screen
      footer={
        <View className="gap-xs">
          {status ? <CapsuleButton label={en('setup.save')} onPress={save} /> : null}
          <CapsuleButton variant="plain" label={en('setup.skip')} onPress={() => router.replace('/')} />
        </View>
      }
    >
      <View className="gap-lg pt-xxl pb-lg">
        <Text variant="title1" accessibilityRole="header">
          {en('setup.title')}
        </Text>
        <Text variant="body" tone="secondary">
          {en('setup.wifi')}
        </Text>
        <SetupRow name={en('setup.model.gemma')} state={model.state} written={model.written} total={model.total} status={rowStatus(model)} />
        <SetupRow name={en('setup.model.voice')} state={voice.state} written={voice.written} total={voice.total} status={rowStatus(voice)} />
        <SetupRow name={en('setup.model.cards')} state={cards.state} written={cards.written} total={cards.total} status={rowStatus(cards)} />
        {needsDownload ? (
          <CapsuleButton
            variant="tinted"
            label={model.state === 'failed' || voice.state === 'failed' ? en('setup.retry') : en('setup.download')}
            loading={busy}
            disabled={busy}
            onPress={start}
          />
        ) : null}

        <Text variant="headline" accessibilityRole="header">
          {en('setup.q.status')}
        </Text>
        <View className="gap-xs">
          <ChoiceCard label={en('setup.status.pregnant')} chosen={status === 'pregnant'} onPress={() => choose('pregnant')} />
          <ChoiceCard label={en('setup.status.postpartum')} chosen={status === 'postpartum'} onPress={() => choose('postpartum')} />
          <ChoiceCard label={en('setup.status.neither')} chosen={status === 'neither'} onPress={() => choose('neither')} />
        </View>
        {status === 'pregnant' ? <NumberField label={en('setup.weeks')} value={weeks} onChange={setWeeks} /> : null}
        {status === 'postpartum' ? <NumberField label={en('setup.days')} value={days} onChange={setDays} /> : null}
        {status === 'neither' ? (
          <>
            <NumberField label={en('setup.last_period')} value={lastPeriod} onChange={setLastPeriod} />
            <NumberField label={en('setup.cycle_length')} value={cycle} onChange={setCycle} />
          </>
        ) : null}
        {invalid ? <InlineError message={en('setup.invalid')} /> : null}
      </View>
    </Screen>
  );
}
