import { env } from '@huggingface/transformers';
import type { WorkerName, WorkerRequest } from '../src/ai/protocol';
import { handleRequest, localRuntimePaths } from './handle';

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
  scope.addEventListener('message', (event) => {
    scope.postMessage(handleRequest(name, event.data, info));
  });
}
