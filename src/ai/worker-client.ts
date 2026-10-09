import type { WorkerName, WorkerRequest, WorkerRequestBody, WorkerResponse } from './protocol';

export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  addEventListener(type: string, listener: (event: Event) => void): void;
  terminate(): void;
}

type Reply = Exclude<WorkerResponse, { type: 'error' }>;

export function createWorkerClient(worker: WorkerLike) {
  let nextId = 1;
  const pending = new Map<number, { resolve: (reply: Reply) => void; reject: (error: Error) => void }>();

  worker.addEventListener('message', (event) => {
    const response = (event as MessageEvent<WorkerResponse>).data;
    const waiting = pending.get(response.id);
    if (!waiting) return;
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
    request(body: WorkerRequestBody): Promise<Reply> {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ ...body, id });
      });
    },
    terminate() {
      worker.terminate();
    },
  };
}

export function workerUrl(name: WorkerName, baseUrl = process.env.EXPO_BASE_URL ?? '') {
  return `${baseUrl}/workers/${name}-worker.js`;
}
