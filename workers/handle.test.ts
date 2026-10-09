import { describe, expect, it } from 'vitest';
import type { WorkerRequest } from '../src/ai/protocol';
import { handleRequest, localRuntimePaths } from './handle';

describe('handleRequest', () => {
  it('answers a ping with a pong naming the worker and its runtime', () => {
    expect(handleRequest('ml', { id: 7, type: 'ping' }, { webgpu: false, runtime: '4.3.1' })).toEqual({
      id: 7,
      type: 'pong',
      worker: 'ml',
      webgpu: false,
      runtime: '4.3.1',
    });
  });

  it('answers an unknown request with an error reply for that id', () => {
    const unknown = { id: 3, type: 'bogus' } as unknown as WorkerRequest;
    expect(handleRequest('ai', unknown, { webgpu: true, runtime: '4.3.1' })).toEqual({
      id: 3,
      type: 'error',
      message: 'Unknown request: bogus',
    });
  });
});

describe('localRuntimePaths', () => {
  it('serves the ONNX runtime from the site itself, not a CDN', () => {
    const paths = localRuntimePaths('https://joshfermano.github.io/liora-local/workers/ai-worker.js');
    expect(paths).toEqual({
      mjs: 'https://joshfermano.github.io/liora-local/ort/ort-wasm-simd-threaded.asyncify.mjs',
      wasm: 'https://joshfermano.github.io/liora-local/ort/ort-wasm-simd-threaded.asyncify.wasm',
    });
  });
});
