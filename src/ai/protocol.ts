export type WorkerName = 'ai' | 'ml';

export type TokenEmbeddings = 'quantized' | 'q4f16';

export type LoadTarget =
  | { model: 'gemma4-q4f16'; embeddings: TokenEmbeddings }
  | { model: 'gemma4-qat-mobile' }
  | { model: 'embeddinggemma2-text' };

export type ModelName = LoadTarget['model'];

export type WorkerRequestBody =
  | { type: 'ping' }
  | ({ type: 'load' } & LoadTarget)
  | { type: 'probe' }
  | { type: 'release' };

export type WorkerRequest = WorkerRequestBody & { id: number };

export type ProgressEvent = { file: string; loaded: number; total: number };

export type WorkerResponse =
  | { id: number; type: 'pong'; worker: WorkerName; webgpu: boolean; runtime: string }
  | ({ id: number; type: 'progress' } & ProgressEvent)
  | { id: number; type: 'loaded'; model: ModelName; loadMs: number }
  | { id: number; type: 'probed'; model: ModelName; probeMs: number; detail: string; embeddingSize?: number }
  | { id: number; type: 'released' }
  | { id: number; type: 'error'; message: string };
