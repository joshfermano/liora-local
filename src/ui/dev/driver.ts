import { addDays, format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useCompanionStore } from '../../store/companion';
import { useLogStore } from '../../store/log';
import { useMemoryStore } from '../../store/memory';
import { canSay } from '../../store/agent';
import { modelBytesOnDisk, runGemmaOnCpu } from '../../ai/gemma-native';
import { gemmaSession, releaseGemma, runSay } from '../../ai/gemma-session';
import { routeWithGemma } from '../../ai/agent-router';
import { useAiStatus } from '../status';
import { setModelTimeScale } from '../../core/timing';

// Development only. Lets a test on the Mac drive the real chat in the iOS Simulator and wait for the
// reply: the simulator's localhost is the Mac, where the test serves the next command. On a phone
// nothing answers at launch, so it stops after one try.
const DRIVER = 'http://localhost:8099';
const POLL_MS = 700;
const SIMULATOR_SLOWER = 30;

const day = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');
const period = (id: string, start: number, end: number | null) => ({ id, start: day(start), end: end === null ? null : day(end), flow_by_day: {}, source: 'calendar' as const });
const log = (n: number, part: Record<string, unknown>) => ({ date: day(n), flow: null, symptoms: [], moods: [], activities: [], ...part });

// Lived-in accounts, not empty ones: three months of cycles, logs and a note.
export const SEEDS = {
  cycler: {
    setup: { status: 'neither', name: 'Mariela' },
    periods: [period('a', -86, -82), period('b', -57, -53), period('c', -28, -23)],
    dayLogs: [log(0, { symptoms: ['headache', 'mood_changes'] }), log(-1, { moods: ['tired'] }), log(-3, { activities: ['exercise'], moods: ['joyful'] })],
    notes: ['my OB is Dr. Santos'],
  },
  mama: {
    setup: { status: 'pregnant', name: 'Mariela', weeks: 30 },
    periods: [],
    dayLogs: [log(-1, { symptoms: ['back_pain'], moods: ['tired'] })],
    notes: ['check-up ko sa susunod na Martes'],
  },
  newmom: {
    setup: { status: 'postpartum', name: 'Mariela' },
    periods: [],
    dayLogs: [log(-1, { symptoms: ['sleep_quality', 'fatigue'], moods: ['sad'] })],
    notes: [],
  },
} as const;

export interface DevCommand {
  id?: string;
  seed?: keyof typeof SEEDS;
  reset?: boolean;
  say?: string;
  // Times a tiny reply, to tell a slow model from a stuck one.
  bench?: boolean;
  // Runs only the router on these words and reports its tools.
  route?: string;
}

// Seeds or clears first, then sends her words; resolves once Liora's reply is finished.
export async function runDevCommand(cmd: DevCommand): Promise<void> {
  const account = cmd.seed ? SEEDS[cmd.seed] : undefined;
  if (account) {
    useLogStore.setState({ setup: { ...account.setup }, periods: [...account.periods] as never, dayLogs: [...account.dayLogs] as never, entries: [], moods: [] });
    useMemoryStore.getState().setNotes([...account.notes]);
  }
  if (account || cmd.reset) useCompanionStore.getState().wipe();
  if (cmd.say) await useCompanionStore.getState().send(cmd.say);
}

export function useDevDriver(): void {
  const router = useRouter();
  useEffect(() => {
    if (!__DEV__) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = async (first: boolean) => {
      if (stopped) return;
      try {
        const res = await fetch(`${DRIVER}/cmd`);
        // Answering at all means the simulator: its model runs on the Mac's CPU, slower than the phone's GPU.
        if (first) {
          setModelTimeScale(SIMULATOR_SLOWER);
          runGemmaOnCpu(true);
          await releaseGemma();
          await gemmaSession().catch(() => null);
        }
        if (res.status === 200) {
          const cmd = (await res.json()) as DevCommand;
          router.navigate('/(tabs)/liora');
          let bench: unknown;
          if (cmd.bench) {
            const t = Date.now();
            const text = await runSay([{ role: 'user', content: 'Say hello in five words.' }], { nPredict: 16, temperature: 0, timeoutMs: 120000 }).catch((e: Error) => `ERR ${e.message}`);
            bench = { ms: Date.now() - t, text };
          }
          if (cmd.route) {
            const t = Date.now();
            bench = { ms: Date.now() - t, actions: await routeWithGemma(cmd.route) };
          }
          await runDevCommand(cmd);
          // What the test cannot see on screen: whether Gemma is loaded and wording replies.
          const gemma = await gemmaSession().catch(() => null);
          const info = JSON.stringify({ aiOn: useAiStatus.getState().on, canSay: canSay(), modelBytes: modelBytesOnDisk(), gpu: gemma?.gpu, noGpu: gemma?.reasonNoGPU, loadMs: gemma?.loadMs, bench });
          await fetch(`${DRIVER}/done?id=${encodeURIComponent(cmd.id ?? '')}&info=${encodeURIComponent(info)}`);
        }
      } catch {
        if (first) return;
      }
      timer = setTimeout(() => void next(false), POLL_MS);
    };
    void next(true);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [router]);
}
