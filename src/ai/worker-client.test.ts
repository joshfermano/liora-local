import { describe, expect, it } from 'vitest';
import type { WorkerRequest, WorkerResponse } from './protocol';
import { createWorkerClient, publicBase, workerUrl, type WorkerLike } from './worker-client';

class FakeWorker extends EventTarget implements WorkerLike {
  sent: WorkerRequest[] = [];
  postMessage(message: WorkerRequest) {
    this.sent.push(message);
  }
  reply(response: WorkerResponse) {
    this.dispatchEvent(new MessageEvent('message', { data: response }));
  }
  crash(message: string) {
    const event = new Event('error') as Event & { message: string };
    event.message = message;
    this.dispatchEvent(event);
  }
  terminate() {}
}

describe('createWorkerClient', () => {
  it('resolves a ping with the pong the worker sends for that request', async () => {
    const worker = new FakeWorker();
    const client = createWorkerClient(worker);
    const pending = client.request({ type: 'ping' });
    const sent = worker.sent[0]!;
    worker.reply({ id: sent.id, type: 'pong', worker: 'ai', webgpu: true, runtime: '4.3.1' });
    await expect(pending).resolves.toMatchObject({ type: 'pong', worker: 'ai' });
  });

  it('resolves concurrent requests with their own replies, even out of order', async () => {
    const worker = new FakeWorker();
    const client = createWorkerClient(worker);
    const first = client.request({ type: 'ping' });
    const second = client.request({ type: 'ping' });
    const [a, b] = worker.sent;
    worker.reply({ id: b!.id, type: 'pong', worker: 'ml', webgpu: false, runtime: 'second' });
    worker.reply({ id: a!.id, type: 'pong', worker: 'ml', webgpu: false, runtime: 'first' });
    await expect(first).resolves.toMatchObject({ runtime: 'first' });
    await expect(second).resolves.toMatchObject({ runtime: 'second' });
  });

  it('rejects only the request whose reply is an error', async () => {
    const worker = new FakeWorker();
    const client = createWorkerClient(worker);
    const failing = client.request({ type: 'ping' });
    const passing = client.request({ type: 'ping' });
    const [a, b] = worker.sent;
    worker.reply({ id: a!.id, type: 'error', message: 'model failed to load' });
    worker.reply({ id: b!.id, type: 'pong', worker: 'ai', webgpu: true, runtime: '4.3.1' });
    await expect(failing).rejects.toThrow('model failed to load');
    await expect(passing).resolves.toMatchObject({ type: 'pong' });
  });

  it('rejects every pending request when the worker crashes', async () => {
    const worker = new FakeWorker();
    const client = createWorkerClient(worker);
    const first = client.request({ type: 'ping' });
    const second = client.request({ type: 'ping' });
    worker.crash('out of memory');
    await expect(first).rejects.toThrow('out of memory');
    await expect(second).rejects.toThrow('out of memory');
  });
});

describe('createWorkerClient progress', () => {
  it('hands progress events to the listener of the request they belong to, and keeps waiting', async () => {
    const worker = new FakeWorker();
    const client = createWorkerClient(worker);
    const seen: string[] = [];
    const first = client.request({ type: 'probe' }, (e) => seen.push(`a:${e.file}:${e.loaded}/${e.total}`));
    const second = client.request({ type: 'release' }, (e) => seen.push(`b:${e.file}`));
    const [a, b] = worker.sent;
    worker.reply({ id: a!.id, type: 'progress', file: 'x.onnx_data', loaded: 5, total: 10 });
    worker.reply({ id: b!.id, type: 'progress', file: 'y.onnx', loaded: 1, total: 2 });
    expect(seen).toEqual(['a:x.onnx_data:5/10', 'b:y.onnx']);
    worker.reply({ id: a!.id, type: 'probed', model: 'embeddinggemma2-text', probeMs: 3, detail: 'ok' });
    await expect(first).resolves.toMatchObject({ type: 'probed' });
    worker.reply({ id: b!.id, type: 'released' });
    await expect(second).resolves.toMatchObject({ type: 'released' });
  });

  it('ignores progress for a request without a listener', async () => {
    const worker = new FakeWorker();
    const client = createWorkerClient(worker);
    const pending = client.request({ type: 'release' });
    const sent = worker.sent[0]!;
    worker.reply({ id: sent.id, type: 'progress', file: 'x', loaded: 1, total: 2 });
    worker.reply({ id: sent.id, type: 'released' });
    await expect(pending).resolves.toMatchObject({ type: 'released' });
  });
});

describe('workerUrl', () => {
  it('puts the worker file under the site base address', () => {
    expect(workerUrl('ai', '/liora-local')).toBe('/liora-local/workers/ai-worker.js');
  });

  it('works when the site is served from the root', () => {
    expect(workerUrl('ml', '')).toBe('/workers/ml-worker.js');
  });
});

describe('publicBase', () => {
  it('uses the site base address in the published build', () => {
    expect(publicBase({ NODE_ENV: 'production', EXPO_BASE_URL: '/liora-local' })).toBe('/liora-local');
  });

  it('uses the root in development, where Expo serves public files from /', () => {
    expect(publicBase({ NODE_ENV: 'development', EXPO_BASE_URL: '/liora-local' })).toBe('');
  });
});
