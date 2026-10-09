import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, Text } from 'react-native';
import { CHECK_PHRASES, DEMO_PHRASES } from '../../src/ai/demo-phrases';
import { downloadModel, downloadVoice, modelBytesOnDisk, voiceBytesOnDisk, type NativeGemma } from '../../src/ai/gemma-native';
import { gemmaSession, releaseGemma } from '../../src/ai/gemma-session';
import { toFindings } from '../../src/ai/typed-decisions';
import { runPipeline } from '../../src/core/pipeline';
import { parseCases, scoreRun } from '../../src/eval/score';
import casesJson from '../../eval/cases.json';
import { useVoiceNote } from '../../src/ai/use-voice-note';
import { rankCards } from '../../src/ai/card-index';
import { downloadEmbedder, embedderBytesOnDisk } from '../../src/ai/embedder';
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
  const [voiceOnDisk, setVoiceOnDisk] = useState(0);
  const voiceNote = useVoiceNote();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Record<string, unknown>[]>([]);
  const gemma = useRef<NativeGemma | null>(null);

  useEffect(() => {
    setOnDisk(modelBytesOnDisk());
    setVoiceOnDisk(voiceBytesOnDisk());
  }, []);
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
      setVoiceOnDisk(voiceBytesOnDisk());
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
      await releaseGemma();
      gemma.current = await gemmaSession();
      const { loadMs, gpu, reasonNoGPU, voice } = gemma.current;
      record({ step: 'load', ok: true, ms: loadMs, gpu, reasonNoGPU, voice });
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

  // LUM-77: the team's held-out phrases through the real pipeline (word list, Gemma, the rules).
  const runEval = () =>
    run('eval', async () => {
      if (!gemma.current) throw new Error('Load Gemma 4 first');
      const cases = parseCases(casesJson);
      if (cases.length === 0) throw new Error('eval/cases.json has no cases yet (LUM-77)');
      const results = [];
      const times: number[] = [];
      for (const c of cases) {
        setStatus(`eval ${results.length + 1} of ${cases.length}`);
        const started = Date.now();
        const { answers } = await gemma.current.decide(c.text);
        times.push(Date.now() - started);
        const entry = runPipeline({ id: c.id, now: new Date(), text: c.text, input: 'text', context: { status: 'pregnant' }, typedAnswers: answers });
        results.push({ case: c, entry });
      }
      const sorted = [...times].sort((a, b) => a - b);
      record({
        step: 'eval',
        ...scoreRun(results),
        medianMs: sorted[Math.floor(sorted.length / 2)],
        slowestMs: sorted[sorted.length - 1],
        mismatched: results
          .filter((r) => r.entry.decision.level !== r.case.expectLevel)
          .map((r) => `${r.case.id}: expected ${r.case.expectLevel}, got ${r.entry.decision.level}`),
      });
    });

  const downloadVoiceAddOn = () =>
    run('download voice', async () => {
      const started = Date.now();
      let last = 0;
      await downloadVoice((written, total) => {
        if (Date.now() - last < 500) return;
        last = Date.now();
        setStatus(`download voice: ${MB(written)} of ${MB(total)}`);
      });
      record({ step: 'download voice', ok: true, ms: Date.now() - started, bytes: voiceBytesOnDisk() });
    });

  const rankDemoCards = () =>
    run('card search', async () => {
      if (embedderBytesOnDisk() <= 0) {
        let last = 0;
        await downloadEmbedder((written, total) => {
          if (Date.now() - last < 500) return;
          last = Date.now();
          setStatus(`download card search: ${MB(written)} of ${MB(total)}`);
        });
      }
      for (const message of [...DEMO_PHRASES, ...CHECK_PHRASES]) {
        setStatus(`searching cards for "${message}"`);
        const started = Date.now();
        const ranked = await rankCards(message, { status: 'pregnant' }, 3);
        record({ step: 'cards', message, ms: Date.now() - started, ranked: ranked.map((r) => `${r.id} ${r.score.toFixed(3)}`) });
      }
    });

  const toggleRecording = async () => {
    if (voiceNote.state !== 'recording') {
      await voiceNote.start().catch((e: unknown) => record({ step: 'record', ok: false, error: String(e) }));
      return;
    }
    const seconds = voiceNote.seconds;
    setStatus('writing down what you said');
    const heard = await voiceNote.stop();
    record({ step: 'transcribe', ok: Boolean(heard), seconds, ms: heard?.ms, text: heard?.text ?? null, error: voiceNote.error });
    setStatus(heard ? `heard: ${heard.text}` : `nothing heard${voiceNote.error ? ` (${voiceNote.error})` : ''}`);
  };

  const report = JSON.stringify(
    { build: 'native', modelOnDiskMB: Math.round(onDisk / 1048576), voiceOnDiskMB: Math.round(voiceOnDisk / 1048576), log },
    null,
    2,
  );

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 pt-16">
      <Text>Native model test (LUM-79)</Text>
      <Text>Gemma 4 E2B Q4_0 on this phone: {onDisk ? MB(onDisk) : 'not downloaded'}</Text>
      <Button disabled={busy} title="1. Download Gemma 4 E2B (about 2.8 GB, Wi-Fi)" onPress={download} />
      <Button disabled={busy} title="2. Load Gemma 4 on this iPhone" onPress={load} />
      <Button disabled={busy} title="3. Answer the 3 demo phrases" onPress={() => answer('demo phrases', DEMO_PHRASES)} />
      <Button disabled={busy} title="4. Answer 5 more phrases" onPress={() => answer('more phrases', CHECK_PHRASES)} />
      <Text>Voice add-on on this phone: {voiceOnDisk ? MB(voiceOnDisk) : 'not downloaded'}</Text>
      <Button disabled={busy} title="5. Download the voice add-on (about 530 MB), then tap 2 again" onPress={downloadVoiceAddOn} />
      <Button
        disabled={busy || voiceNote.state === 'transcribing'}
        title={voiceNote.state === 'recording' ? `6. Stop (${voiceNote.seconds} s) and write it down` : '6. Record a sentence'}
        onPress={toggleRecording}
      />
      <Button disabled={busy} title="7. Card search: download (about 265 MB) and rank cards for 8 phrases" onPress={rankDemoCards} />
      <Button disabled={busy} title="8. Run the eval set (eval/cases.json)" onPress={runEval} />
      <Text>{status}</Text>
      <Button title="Share results" onPress={() => Share.share({ message: report })} />
      <Text selectable>{report}</Text>
    </ScrollView>
  );
}
