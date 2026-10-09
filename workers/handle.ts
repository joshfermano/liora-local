import type { WorkerName, WorkerRequest, WorkerResponse } from '../src/ai/protocol';

export type RuntimeInfo = { webgpu: boolean; runtime: string };

export function handleRequest(worker: WorkerName, request: WorkerRequest, info: RuntimeInfo): WorkerResponse {
  switch (request.type) {
    case 'ping':
      return { id: request.id, type: 'pong', worker, ...info };
    default:
      return { id: request.id, type: 'error', message: `Unknown request: ${(request as { type: string }).type}` };
  }
}

export function localRuntimePaths(workerHref: string) {
  const file = (ext: string) => new URL(`../ort/ort-wasm-simd-threaded.asyncify.${ext}`, workerHref).href;
  return { mjs: file('mjs'), wasm: file('wasm') };
}
