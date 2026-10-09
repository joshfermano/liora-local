import type { ProgressEvent, WorkerName, WorkerRequest, WorkerRequestBody, WorkerResponse } from './protocol';

export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  addEventListener(type: string, listener: (event: Event) => void): void;
  terminate(): void;
}

type Reply = Exclude<WorkerResponse, { type: 'error' | 'progress' }>;

export function createWorkerClient(worker: WorkerLike) {
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (reply: Reply) => void; reject: (error: Error) => void; onProgress?: (event: ProgressEvent) => void }
  >();

  worker.addEventListener('message', (event) => {
    const response = (event as MessageEvent<WorkerResponse>).data;
    const waiting = pending.get(response.id);
    if (!waiting) return;
    if (response.type === 'progress') {
      waiting.onProgress?.({ file: response.file, loaded: response.loaded, total: response.total });
      return;
    }
    pending.delete(response.id);
    if (response.type === 'error') waiting.reject(new Error(response.message));
    else waiting.resolve(response);
  });

  worker.addEventListener('error', (event) => {
    const error = new Error((event as ErrorEvent).message || 'The worker stopped unexpectedly');
    for (const waiting of pending.values()) waiting.reject(error);
    pending.clear();
  });

  return {
    request(body: WorkerRequestBody, onProgress?: (event: ProgressEvent) => void): Promise<Reply> {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, onProgress });
        worker.postMessage({ ...body, id });
      });
    },
    terminate() {
      worker.terminate();
    },
  };
}

// Expo serves public/ from the root in development and under the base URL in the export.
export function publicBase(env: { NODE_ENV?: string; EXPO_BASE_URL?: string }) {
  return env.NODE_ENV === 'production' ? (env.EXPO_BASE_URL ?? '') : '';
}

export function workerUrl(
  name: WorkerName,
  baseUrl = publicBase({ NODE_ENV: process.env.NODE_ENV, EXPO_BASE_URL: process.env.EXPO_BASE_URL }),
) {
  return `${baseUrl}/workers/${name}-worker.js`;
}
