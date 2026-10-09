export type WorkerName = 'ai' | 'ml';

export type WorkerRequestBody = { type: 'ping' };

export type WorkerRequest = WorkerRequestBody & { id: number };

export type WorkerResponse =
  | { id: number; type: 'pong'; worker: WorkerName; webgpu: boolean; runtime: string }
  | { id: number; type: 'error'; message: string };
