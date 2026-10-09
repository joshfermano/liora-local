import { env } from '@huggingface/transformers';
import type { WorkerName, WorkerRequest, WorkerResponse } from '../src/ai/protocol';
import { handleRequest, localRuntimePaths } from './handle';
import { createModelHost } from './host';
import { loaders } from './loaders';

type WorkerScope = {
  location: { href: string };
  navigator: { gpu?: unknown };
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerRequest>) => void): void;
  postMessage(message: unknown): void;
};

export function startWorker(name: WorkerName) {
  const scope = self as unknown as WorkerScope;
  const onnx = env.backends.onnx as { wasm?: { wasmPaths?: unknown } };
  if (onnx.wasm) onnx.wasm.wasmPaths = localRuntimePaths(scope.location.href);
  env.allowLocalModels = false;

  const info = { webgpu: 'gpu' in scope.navigator, runtime: env.version };
  const host = createModelHost(loaders, () => performance.now(), (response) => scope.postMessage(response));

  scope.addEventListener('message', (event) => {
    const request = event.data;
    if (request.type === 'load' || request.type === 'probe' || request.type === 'release') {
      void host.handle(request).then((response: WorkerResponse) => scope.postMessage(response));
    } else {
      scope.postMessage(handleRequest(name, request, info));
    }
  });
}
