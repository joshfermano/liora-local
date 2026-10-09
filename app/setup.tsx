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
import { PROFILE_RANGES, updateProfile } from '../src/store/profile';
import { useTellStore } from '../src/store/tell';
import type { Season } from '../src/ui/art';
import { CapsuleButton } from '../src/ui/CapsuleButton';
import { tap } from '../src/ui/haptics';
import { Lattice } from '../src/ui/Lattice';
import { cleanName, mergeSetup, NAME_MAX } from '../src/ui/name';
import { SetupRow, type RowState } from '../src/ui/SetupRow';
import { ChoicePane } from '../src/ui/setup/ChoicePane';
import { Sheet } from '../src/ui/setup/Sheet';
import { EXPECTED_BYTES } from '../src/ui/setup/sizes';
import { DateRow } from '../src/ui/setup/DateRow';
import { WheelRow } from '../src/ui/setup/WheelRow';
import { useAiStatus } from '../src/ui/status';
import { Text } from '../src/ui/Text';
import { TEXT_TONE } from '../src/ui/theme';

type Status = Context['status'];
interface Progress {
  state: RowState;
  written: number;
  total: number;
}

const web = Platform.OS === 'web';
const TOTAL = 4;
const initial = (bytes: number): Progress =>
  web
    ? { state: 'web', written: 0, total: 0 }
    : bytes > 0
      ? { state: 'done', written: bytes, total: bytes }
      : { state: 'idle', written: 0, total: 0 };

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Setup() {
  const router = useRouter();
  // Coming back from Profile (she has already answered) opens at the downloads.
  const [step, setStep] = useState(() => (useLogStore.getState().setup?.status ? 4 : 1));
  const [model, setModel] = useState<Progress>(() => initial(modelBytesOnDisk()));
  const [voice, setVoice] = useState<Progress>(() => initial(voiceBytesOnDisk()));
  const [cards, setCards] = useState<Progress>(() => initial(embedderBytesOnDisk()));
  const [name, setName] = useState(() => cleanName(String(useLogStore.getState().setup?.name ?? '')));
  const [status, setStatus] = useState<Status | null>(null);
  const [weeks, setWeeks] = useState<number | undefined>(undefined);
  const [days, setDays] = useState<number | undefined>(undefined);
  const [lastPeriod, setLastPeriod] = useState(() => new Date());
  const [cycle, setCycle] = useState<number | undefined>(undefined);
  const [wheel, setWheel] = useState<'weeks' | 'days' | 'cycle' | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  // Opening a wheel shows a starting point; the value counts once she has opened it.
  const openWheel = (which: 'weeks' | 'days' | 'cycle', current: number | undefined, start: number, set: (n: number) => void) => {
    tap();
    setDateOpen(false);
    if (wheel === which) return setWheel(null);
    if (current === undefined) set(start);
    setWheel(which);
  };
  const [age, setAge] = useState<number>();
  const [height, setHeight] = useState<number>();
  const [weight, setWeight] = useState<number>();
  const [open, setOpen] = useState<'age' | 'height' | 'weight' | null>(null);

  const busy = model.state === 'busy' || voice.state === 'busy' || cards.state === 'busy';
  const failed = model.state === 'failed' || voice.state === 'failed' || cards.state === 'failed';
  const needsDownload = !web && (model.state !== 'done' || voice.state !== 'done' || cards.state !== 'done');
  const canStart = web || model.state === 'done';

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

  const saveStatus = () => {
    const log = useLogStore.getState();
    if (status === 'pregnant') {
      useTellStore.getState().setContext(weeks === undefined ? { status } : { status, weeks });
      mergeSetup({ status, weeks });
    } else if (status === 'postpartum') {
      useTellStore.getState().setContext(days === undefined ? { status } : { status, days_since_birth: days });
      mergeSetup({ status, days_since_birth: days });
    } else if (status === 'neither') {
      const start = ymd(lastPeriod);
      useTellStore.getState().setContext({ status });
      mergeSetup({ status, last_period_start: start, cycle_length: cycle });
      log.setPeriods([{ id: `setup-${start}`, start, end: null, flow_by_day: {}, source: 'setup' }]);
      // Only a length she chose is stated; Liora never assumes 28 days.
      if (cycle !== undefined) log.setCycleSettings({ ...log.cycleSettings, stated_cycle_length: cycle });
    }
  };

  const next = () => {
    tap();
    if (step === 1) mergeSetup({ name: cleanName(name) || undefined });
    if (step === 2) saveStatus();
    setWheel(null);
    if (step === 3) updateProfile({ age, heightCm: height, weightKg: weight });
    setOpen(null);
    setStep((s) => s + 1);
  };
  const back = () => {
    setOpen(null);
    setStep((s) => Math.max(1, s - 1));
  };
  const done = () => router.replace('/');
  const toggle = (k: 'age' | 'height' | 'weight', set: (n: number) => void, def: number, value?: number) => {
    tap();
    if (open === k) return setOpen(null);
    if (value === undefined) set(def);
    setOpen(k);
  };

  const season: Season =
    step === 1 ? 'period' : step === 3 ? (status === 'pregnant' ? 'pregnant' : status === 'postpartum' ? 'postpartum' : 'calm') : 'calm';

  const R = PROFILE_RANGES;
  let title = en('onboarding.welcome.title');
  let line = en('onboarding.welcome.line');
  let body: React.ReactNode = null;

  if (step === 1) {
    body = (
      <>
        <Lattice>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={next}
            accessibilityLabel={en('name.question')}
            placeholder={en('name.question')}
            maxLength={NAME_MAX}
            autoCapitalize="words"
            autoComplete="given-name"
            textContentType="givenName"
            returnKeyType="done"
            className={`min-h-choice px-md text-body ${TEXT_TONE.label}`}
          />
        </Lattice>
        <Text variant="footnote" tone="secondary" className="px-md">
          {en('name.optional')}
        </Text>
        <CapsuleButton label={en('onboarding.continue')} onPress={next} />
      </>
    );
  } else if (step === 2) {
    title = en('setup.q.status');
    line = en('onboarding.status.line');
    body = (
      <>
        <View className="gap-xs">
          <ChoicePane label={en('setup.status.pregnant')} chosen={status === 'pregnant'} onPress={() => setStatus('pregnant')} />
          <ChoicePane label={en('setup.status.postpartum')} chosen={status === 'postpartum'} onPress={() => setStatus('postpartum')} />
          <ChoicePane label={en('setup.status.neither')} chosen={status === 'neither'} onPress={() => setStatus('neither')} />
        </View>
        {status === 'pregnant' ? (
          <Lattice>
            <WheelRow label={en('setup.weeks')} value={weeks} min={1} max={45} start={20} open={wheel === 'weeks'} onToggle={() => openWheel('weeks', weeks, 20, setWeeks)} onChange={setWeeks} />
          </Lattice>
        ) : null}
        {status === 'postpartum' ? (
          <Lattice>
            <WheelRow label={en('setup.days')} value={days} min={0} max={365} start={14} open={wheel === 'days'} onToggle={() => openWheel('days', days, 14, setDays)} onChange={setDays} />
          </Lattice>
        ) : null}
        {status === 'neither' ? (
          <Lattice footer={en('profile.cycle.footer')}>
            <DateRow
              label={en('onboarding.last_period')}
              value={lastPeriod}
              maximumDate={new Date()}
              open={dateOpen}
              onToggle={() => {
                tap();
                setWheel(null);
                setDateOpen((o) => !o);
              }}
              onChange={setLastPeriod}
            />
            <WheelRow label={en('profile.cycle.stated')} value={cycle} min={15} max={90} unit={en('profile.unit.days')} start={28} open={wheel === 'cycle'} onToggle={() => openWheel('cycle', cycle, 28, setCycle)} onChange={setCycle} />
          </Lattice>
        ) : null}
        <CapsuleButton label={en('onboarding.continue')} onPress={next} disabled={!status} />
      </>
    );
  } else if (step === 3) {
    title = en('profile.about');
    line = en('onboarding.about.line');
    body = (
      <>
        <Lattice footer={en('pf.about_footer')}>
          <WheelRow
            label={en('profile.age')}
            value={age}
            min={R.age[0]}
            max={R.age[1]}
            open={open === 'age'}
            onToggle={() => toggle('age', setAge, 28, age)}
            onChange={setAge}
          />
          <WheelRow
            label={en('profile.height')}
            value={height}
            min={R.heightCm[0]}
            max={R.heightCm[1]}
            unit="cm"
            open={open === 'height'}
            onToggle={() => toggle('height', setHeight, 160, height)}
            onChange={setHeight}
          />
          <WheelRow
            label={en('profile.weight')}
            value={weight}
            min={R.weightKg[0]}
            max={R.weightKg[1]}
            unit="kg"
            open={open === 'weight'}
            onToggle={() => toggle('weight', setWeight, 60, weight)}
            onChange={setWeight}
          />
        </Lattice>
        <View className="gap-sm">
          <CapsuleButton label={en('onboarding.continue')} onPress={next} />
          <CapsuleButton variant="plain" label={en('onboarding.skip')} onPress={() => setStep(4)} />
        </View>
      </>
    );
  } else {
    title = en('onboarding.download.title');
    line = en('setup.wifi');
    body = (
      <>
        <Lattice>
          <SetupRow name={en('setup.model.gemma')} {...model} expected={EXPECTED_BYTES.gemma} />
          <SetupRow name={en('setup.model.voice')} {...voice} expected={EXPECTED_BYTES.voice} />
          <SetupRow name={en('setup.model.cards')} {...cards} expected={EXPECTED_BYTES.cards} />
        </Lattice>
        <View className="gap-sm">
          {needsDownload ? (
            <CapsuleButton
              label={failed ? en('setup.retry') : busy ? en('onboarding.downloading') : en('onboarding.download_all')}
              loading={busy}
              disabled={busy}
              onPress={start}
            />
          ) : null}
          {canStart ? (
            <CapsuleButton variant={needsDownload ? 'neutral' : 'filled'} label={en('onboarding.start')} onPress={done} />
          ) : null}
          <CapsuleButton variant="plain" label={en('setup.skip')} onPress={done} />
        </View>
      </>
    );
  }

  return (
    <Sheet step={step} total={TOTAL} season={season} title={title} line={line} onBack={step > 1 ? back : undefined}>
      {body}
    </Sheet>
  );
}
