import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  addProgress,
  describeInflight,
  formatMB,
  INFLIGHT_KEY,
  totals,
  type FileProgress,
  type Inflight,
} from '../../src/ai/eval-log';
import type { LoadTarget, TokenEmbeddings, WorkerName } from '../../src/ai/protocol';
import { toFindings } from '../../src/ai/typed-decisions';
import { PROVISIONAL_THRESHOLDS } from '../../src/core/merge';
import { evaluate } from '../../src/core/rules';
import { createWorkerClient, workerUrl } from '../../src/ai/worker-client';

type Step = {
  step: string;
  ok: boolean;
  ms?: number;
  detail?: string;
  embeddingSize?: number;
  downloadedMB?: number;
  error?: string;
  answers?: Record<string, number[]>;
};

const DEMO_PHRASES = [
  '32 weeks na ako, sobrang sakit ng ulo tapos malabo paningin',
  'medyo masakit ang balakang ko',
  'masakit ulo ko',
] as const;

type Run = { label: string; startedAt: string; finished: boolean; steps: Step[]; storageUsageMB?: number };

type Facts = Record<string, unknown>;

async function collectFacts(): Promise<Facts> {
  const nav = navigator as unknown as {
    gpu?: { requestAdapter(): Promise<null | { features: Set<string>; limits: Record<string, number>; info?: Record<string, string> }> };
    storage?: { estimate(): Promise<{ usage?: number; quota?: number }> };
    deviceMemory?: number;
  };
  const facts: Facts = {
    userAgent: navigator.userAgent,
    secureContext: window.isSecureContext,
    crossOriginIsolated: window.crossOriginIsolated,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGB: nav.deviceMemory ?? 'not reported',
    webgpu: Boolean(nav.gpu),
  };
  try {
    const adapter = await nav.gpu?.requestAdapter();
    if (adapter) {
      facts.adapter = adapter.info ? { ...adapter.info } : 'info not available';
      facts.shaderF16 = adapter.features.has('shader-f16');
      facts.maxBufferSizeMB = Math.round((adapter.limits.maxBufferSize ?? 0) / 1048576);
      facts.maxStorageBufferBindingSizeMB = Math.round((adapter.limits.maxStorageBufferBindingSize ?? 0) / 1048576);
    } else {
      facts.adapter = 'none';
    }
  } catch (error) {
    facts.adapterError = String(error);
  }
  try {
    const estimate = await nav.storage?.estimate();
    if (estimate) {
      facts.storageUsageMB = Math.round((estimate.usage ?? 0) / 1048576);
      facts.storageQuotaMB = Math.round((estimate.quota ?? 0) / 1048576);
    }
  } catch (error) {
    facts.storageError = String(error);
  }
  return facts;
}

function readInflight(): Inflight | null {
  try {
    const raw = localStorage.getItem(INFLIGHT_KEY);
    return raw ? (JSON.parse(raw) as Inflight) : null;
  } catch {
    return null;
  }
}

function Button({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} className="my-1 border p-3">
      <Text>{title}</Text>
    </Pressable>
  );
}

export default function Eval() {
  const [facts, setFacts] = useState<Facts | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [embeddings, setEmbeddings] = useState<TokenEmbeddings>('q4f16');
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [previous, setPrevious] = useState<string | null>(null);
  const [copied, setCopied] = useState('');
  const files = useRef<FileProgress>({});
  const lastWrite = useRef(0);
  const inflight = useRef<Inflight | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    collectFacts().then(setFacts);
    const left = readInflight();
    if (left) setPrevious(describeInflight(left));
  }, []);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [busy]);

  function saveInflight(patch: Partial<Inflight>, force = false) {
    if (!inflight.current) return;
    inflight.current = { ...inflight.current, ...patch, updatedAt: Date.now() };
    if (!force && Date.now() - lastWrite.current < 700) return;
    lastWrite.current = Date.now();
    try {
      localStorage.setItem(INFLIGHT_KEY, JSON.stringify(inflight.current));
    } catch {}
  }

  function shown() {
    const { loaded, total } = totals(files.current);
    return total ? `${formatMB(loaded)} of ${formatMB(total)}` : 'no download yet';
  }

  async function step(
    run: Run,
    name: string,
    client: ReturnType<typeof createWorkerClient>,
    body: Parameters<typeof client.request>[0],
  ): Promise<boolean> {
    files.current = {};
    saveInflight({ step: name, file: undefined, loaded: 0, total: 0 }, true);
    setStatus(`${name}: running`);
    try {
      const reply = await client.request(body, (event) => {
        files.current = addProgress(files.current, event);
        const { loaded, total } = totals(files.current);
        saveInflight({ file: event.file, loaded, total });
        setStatus(`${name}: ${event.file}`);
      });
      const record: Step = { step: name, ok: true, downloadedMB: Math.round(totals(files.current).loaded / 1048576) };
      if (reply.type === 'loaded') record.ms = Math.round(reply.loadMs);
      if (reply.type === 'probed') {
        record.ms = Math.round(reply.probeMs);
        record.detail = reply.detail;
        record.embeddingSize = reply.embeddingSize;
      }
      if (reply.type === 'decided') {
        const findings = toFindings(reply.answers, PROVISIONAL_THRESHOLDS);
        const decision = evaluate(findings, { status: 'pregnant' });
        const found = findings.map((f) => `${f.code} ${f.severity} ${f.confidence?.toFixed(2)}`).join(', ');
        record.ms = Math.round(reply.totalMs);
        record.detail = `prefix ${reply.prefixTokens} tokens in ${Math.round(reply.prefixMs)} ms; rules: ${decision.level}${decision.follow_up ? ` (${decision.follow_up.code})` : ''}; findings: ${found || 'none'}`;
        record.answers = Object.fromEntries(
          Object.entries(reply.answers).map(([id, probs]) => [id, probs.map((p) => Math.round(p * 1000) / 1000)]),
        );
      }
      run.steps.push(record);
      setRuns((all) => [...all.filter((r) => r !== run), { ...run, steps: [...run.steps] }]);
      return true;
    } catch (error) {
      run.steps.push({ step: name, ok: false, error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async function execute(label: string, plan: { worker: WorkerName; target?: LoadTarget; decide?: readonly string[] }[]) {
    if (busy) return;
    setBusy(label);
    setPrevious(null);
    const run: Run = { label, startedAt: new Date().toISOString(), finished: false, steps: [] };
    inflight.current = { label, startedAt: Date.now(), step: 'starting', loaded: 0, total: 0, updatedAt: Date.now() };
    saveInflight({}, true);
    const started = performance.now();
    const clients = new Map<WorkerName, { client: ReturnType<typeof createWorkerClient>; worker: Worker }>();
    try {
      for (const { worker: name } of plan) {
        if (clients.has(name)) continue;
        const worker = new Worker(workerUrl(name), { type: 'module' });
        clients.set(name, { client: createWorkerClient(worker), worker });
      }
      let ok = true;
      for (const { worker, target, decide } of plan) {
        if (!ok || !target) break;
        const { client } = clients.get(worker)!;
        ok = await step(run, `load ${target.model}`, client, { type: 'load', ...target });
        if (ok) ok = await step(run, `probe ${target.model}`, client, { type: 'probe' });
        for (const message of decide ?? []) {
          if (ok) ok = await step(run, `decide "${message}"`, client, { type: 'decide', message });
        }
      }
      if (ok && plan.length > 1) {
        run.steps.push({ step: 'both models resident, tab alive', ok: true, ms: Math.round(performance.now() - started) });
      }
      for (const [name, { client }] of clients) {
        await step(run, `release ${name}-worker`, client, { type: 'release' });
      }
    } catch (error) {
      run.steps.push({ step: 'setup', ok: false, error: error instanceof Error ? error.message : String(error) });
    } finally {
      for (const { client } of clients.values()) client.terminate();
      run.finished = true;
      try {
        const estimate = await navigator.storage?.estimate();
        run.storageUsageMB = Math.round((estimate?.usage ?? 0) / 1048576);
      } catch {}
      setRuns((all) => [...all.filter((r) => r !== run), { ...run, steps: [...run.steps] }]);
      try {
        localStorage.removeItem(INFLIGHT_KEY);
      } catch {}
      inflight.current = null;
      setBusy(null);
      setStatus('');
    }
  }

  const gemma: LoadTarget = { model: 'gemma4-q4f16', embeddings };
  const embedder: LoadTarget = { model: 'embeddinggemma2-text' };
  const mobile: LoadTarget = { model: 'gemma4-qat-mobile' };
  const report = JSON.stringify({ facts, previous, runs }, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied('Copied');
    } catch {
      setCopied('Copy was blocked: press and hold the box below, select all, copy');
    }
  }

  const elapsed = inflight.current ? Math.round((now - inflight.current.startedAt) / 1000) : 0;

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4">
      <Text>Model fit test (S1)</Text>
      <Text>Open this page on the iPhone. Run one button at a time, then copy the results.</Text>

      {previous ? <Text>{previous}</Text> : null}

      <Text>Token embeddings for Gemma 4 q4f16 (smaller download is q4f16):</Text>
      <View className="flex-row">
        {(['q4f16', 'quantized'] as const).map((choice) => (
          <Pressable key={choice} accessibilityRole="button" onPress={() => setEmbeddings(choice)} className="mr-2 border p-2">
            <Text>{embeddings === choice ? `[x] ${choice}` : `[ ] ${choice}`}</Text>
          </Pressable>
        ))}
      </View>

      <Button disabled={Boolean(busy)} title="Load Gemma 4 E2B q4f16" onPress={() => execute(`gemma4-q4f16 (embeddings ${embeddings})`, [{ worker: 'ai', target: gemma }])} />
      <Button
        disabled={Boolean(busy)}
        title="Gemma 4 q4f16: load, then answer the 3 demo phrases"
        onPress={() => execute(`typed decisions: gemma4-q4f16 (embeddings ${embeddings})`, [{ worker: 'ai', target: gemma, decide: DEMO_PHRASES }])}
      />
      <Button disabled={Boolean(busy)} title="Load Gemma 4 E2B 2-bit (qat-mobile)" onPress={() => execute('gemma4-qat-mobile', [{ worker: 'ai', target: mobile }])} />
      <Button disabled={Boolean(busy)} title="Load EmbeddingGemma 2 (text)" onPress={() => execute('embeddinggemma2-text', [{ worker: 'ml', target: embedder }])} />
      <Button
        title="Load Gemma 4 + EmbeddingGemma 2 together"
        onPress={() =>
          execute(`together: gemma4-q4f16 (embeddings ${embeddings}) + embeddinggemma2-text`, [
            { worker: 'ai', target: gemma },
            { worker: 'ml', target: embedder },
          ])
        }
      />

      {busy ? (
        <View className="my-2 border p-2">
          <Text>Running: {busy}</Text>
          <Text>{status}</Text>
          <Text>Downloaded: {shown()}</Text>
          <Text>Elapsed: {elapsed} s. If the page reloads, it will say what was in flight.</Text>
        </View>
      ) : null}

      <Text>Device facts</Text>
      <Text selectable>{facts ? JSON.stringify(facts, null, 2) : 'reading...'}</Text>

      <Button title="Copy results" onPress={copy} disabled={!facts} />
      {copied ? <Text>{copied}</Text> : null}
      <TextInput multiline editable={false} value={report} className="border p-2" style={{ minHeight: 240 }} />
    </ScrollView>
  );
}
