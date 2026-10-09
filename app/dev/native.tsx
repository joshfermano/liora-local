import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, Text } from 'react-native';
import { CHECK_PHRASES, DEMO_PHRASES } from '../../src/ai/demo-phrases';
import { downloadModel, loadGemma, modelBytesOnDisk, type NativeGemma } from '../../src/ai/gemma-native';
import { toFindings } from '../../src/ai/typed-decisions';
import { PROVISIONAL_THRESHOLDS } from '../../src/core/merge';
import { evaluate } from '../../src/core/rules';

const MB = (bytes: number) => `${(bytes / 1048576).toFixed(0)} MB`;
const round = (probs: number[]) => probs.map((p) => Math.round(p * 1000) / 1000);

function Button({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} className="my-1 border p-3">
      <Text>{title}</Text>
    </Pressable>
  );
}

export default function NativeModelTest() {
  const [onDisk, setOnDisk] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Record<string, unknown>[]>([]);
  const gemma = useRef<NativeGemma | null>(null);

  useEffect(() => setOnDisk(modelBytesOnDisk()), []);
  const record = (entry: Record<string, unknown>) => setLog((all) => [...all, { at: new Date().toISOString(), ...entry }]);

  async function run(label: string, task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setStatus(`${label}: running`);
    try {
      await task();
      setStatus(`${label}: done`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      record({ step: label, ok: false, error: message });
      setStatus(`${label}: failed (${message})`);
    } finally {
      setOnDisk(modelBytesOnDisk());
      setBusy(false);
    }
  }

  const download = () =>
    run('download', async () => {
      const started = Date.now();
      let last = 0;
      await downloadModel((written, total) => {
        if (Date.now() - last < 500) return;
        last = Date.now();
        setStatus(`download: ${MB(written)} of ${MB(total)}`);
      });
      record({ step: 'download', ok: true, ms: Date.now() - started, bytes: modelBytesOnDisk() });
    });

  const load = () =>
    run('load', async () => {
      await gemma.current?.release();
      gemma.current = await loadGemma();
      const { loadMs, gpu, reasonNoGPU } = gemma.current;
      record({ step: 'load', ok: true, ms: loadMs, gpu, reasonNoGPU });
    });

  const answer = (label: string, phrases: readonly string[]) =>
    run(label, async () => {
      if (!gemma.current) throw new Error('Load Gemma 4 first');
      for (const message of phrases) {
        setStatus(`answering "${message}"`);
        const { answers, skipped, ms } = await gemma.current.decide(message);
        const findings = toFindings(answers, PROVISIONAL_THRESHOLDS);
        const decision = evaluate(findings, { status: 'pregnant' });
        record({
          step: 'decide',
          message,
          ms,
          rules: decision.level,
          follow_up: decision.follow_up?.code ?? null,
          findings: findings.map((f) => `${f.code} ${f.severity} ${f.confidence?.toFixed(2)}`),
          skipped,
          answers: Object.fromEntries(Object.entries(answers).map(([id, probs]) => [id, round(probs)])),
        });
      }
    });

  const report = JSON.stringify({ build: 'native', modelOnDiskMB: Math.round(onDisk / 1048576), log }, null, 2);

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 pt-16">
      <Text>Native model test (LUM-79)</Text>
      <Text>Gemma 4 E2B Q4_0 on this phone: {onDisk ? MB(onDisk) : 'not downloaded'}</Text>
      <Button disabled={busy} title="1. Download Gemma 4 E2B (about 2.8 GB, Wi-Fi)" onPress={download} />
      <Button disabled={busy} title="2. Load Gemma 4 on this iPhone" onPress={load} />
      <Button disabled={busy} title="3. Answer the 3 demo phrases" onPress={() => answer('demo phrases', DEMO_PHRASES)} />
      <Button disabled={busy} title="4. Answer 5 more phrases" onPress={() => answer('more phrases', CHECK_PHRASES)} />
      <Text>{status}</Text>
      <Button title="Share results" onPress={() => Share.share({ message: report })} />
      <Text selectable>{report}</Text>
    </ScrollView>
  );
}
