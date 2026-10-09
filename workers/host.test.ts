import { describe, expect, it, vi } from 'vitest';
import type { WorkerResponse } from '../src/ai/protocol';
import { createModelHost, type LoadedModel, type Loaders } from './host';

function setup(overrides: Partial<Loaders> = {}) {
  const dispose = vi.fn(async () => {});
  const model: LoadedModel = { probe: async () => ({ detail: 'ok', embeddingSize: 768 }), dispose };
  let clock = 0;
  const loaders: Loaders = {
    gemma4: vi.fn(async (_spec, onProgress) => {
      onProgress({ file: 'f', loaded: 1, total: 2 });
      clock += 1500;
      return model;
    }),
    embedding: vi.fn(async () => {
      clock += 200;
      return model;
    }),
    ...overrides,
  };
  const sent: WorkerResponse[] = [];
  const host = createModelHost(loaders, () => clock, (r) => sent.push(r));
  return { host, loaders, dispose, sent, tick: (ms: number) => (clock += ms) };
}

describe('createModelHost', () => {
  it('loads Gemma 4, streams progress and reports the load time', async () => {
    const { host, loaders, sent } = setup();
    const reply = await host.handle({ id: 1, type: 'load', model: 'gemma4-q4f16', embeddings: 'q4f16' });
    expect(reply).toEqual({ id: 1, type: 'loaded', model: 'gemma4-q4f16', loadMs: 1500 });
    expect(sent).toEqual([{ id: 1, type: 'progress', file: 'f', loaded: 1, total: 2 }]);
    expect(loaders.gemma4).toHaveBeenCalledWith(
      expect.objectContaining({ repo: 'onnx-community/gemma-4-E2B-it-ONNX' }),
      expect.any(Function),
    );
  });

  it('loads the embedding model through its own loader', async () => {
    const { host, loaders } = setup();
    const reply = await host.handle({ id: 2, type: 'load', model: 'embeddinggemma2-text' });
    expect(reply).toMatchObject({ type: 'loaded', loadMs: 200 });
    expect(loaders.embedding).toHaveBeenCalled();
  });

  it('probes the loaded model and reports time, detail and embedding size', async () => {
    const { host, tick } = setup();
    await host.handle({ id: 1, type: 'load', model: 'embeddinggemma2-text' });
    tick(0);
    const reply = await host.handle({ id: 2, type: 'probe' });
    expect(reply).toMatchObject({ id: 2, type: 'probed', model: 'embeddinggemma2-text', detail: 'ok', embeddingSize: 768 });
  });

  it('turns a load failure into an error reply with the message', async () => {
    const { host } = setup({ gemma4: async () => Promise.reject(new Error('no WebGPU adapter')) });
    const reply = await host.handle({ id: 3, type: 'load', model: 'gemma4-qat-mobile' });
    expect(reply).toEqual({ id: 3, type: 'error', message: 'no WebGPU adapter' });
  });

  it('turns a non-Error failure into a readable message', async () => {
    const { host } = setup({ embedding: async () => Promise.reject(7) });
    const reply = await host.handle({ id: 3, type: 'load', model: 'embeddinggemma2-text' });
    expect(reply).toEqual({ id: 3, type: 'error', message: '7' });
  });

  it('errors on probe when nothing is loaded', async () => {
    const { host } = setup();
    const reply = await host.handle({ id: 4, type: 'probe' });
    expect(reply).toMatchObject({ type: 'error' });
  });

  it('disposes the loaded model on release, then has nothing loaded', async () => {
    const { host, dispose } = setup();
    await host.handle({ id: 1, type: 'load', model: 'embeddinggemma2-text' });
    expect(await host.handle({ id: 2, type: 'release' })).toEqual({ id: 2, type: 'released' });
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(await host.handle({ id: 3, type: 'probe' })).toMatchObject({ type: 'error' });
  });

  it('disposes the previous model before loading another (one resident model per worker)', async () => {
    const { host, dispose } = setup();
    await host.handle({ id: 1, type: 'load', model: 'embeddinggemma2-text' });
    await host.handle({ id: 2, type: 'load', model: 'embeddinggemma2-text' });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('releases cleanly when nothing is loaded', async () => {
    const { host } = setup();
    expect(await host.handle({ id: 1, type: 'release' })).toEqual({ id: 1, type: 'released' });
  });
});
