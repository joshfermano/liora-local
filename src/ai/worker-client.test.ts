import { describe, expect, it } from 'vitest';
import type { WorkerRequest, WorkerResponse } from './protocol';
import { createWorkerClient, workerUrl, type WorkerLike } from './worker-client';

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

describe('workerUrl', () => {
  it('puts the worker file under the site base address', () => {
    expect(workerUrl('ai', '/liora-local')).toBe('/liora-local/workers/ai-worker.js');
  });

  it('works when the site is served from the root', () => {
    expect(workerUrl('ml', '')).toBe('/workers/ml-worker.js');
  });
});
