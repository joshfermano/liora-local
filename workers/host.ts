import { specFor, type ModelSpec } from '../src/ai/model-specs';
import type { ModelName, ProgressEvent, WorkerRequest, WorkerResponse } from '../src/ai/protocol';

export type Decided = { answers: Record<string, number[]>; prefixTokens: number; prefixMs: number };

export type LoadedModel = {
  probe(): Promise<{ detail: string; embeddingSize?: number }>;
  decide?(message: string): Promise<Decided>;
  dispose(): Promise<void>;
};

type SpecOf<K extends ModelSpec['kind']> = Extract<ModelSpec, { kind: K }>;

export type Loaders = {
  gemma4(spec: SpecOf<'gemma4'>, onProgress: (event: ProgressEvent) => void): Promise<LoadedModel>;
  embedding(spec: SpecOf<'embedding'>, onProgress: (event: ProgressEvent) => void): Promise<LoadedModel>;
};

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createModelHost(loaders: Loaders, now: () => number, post: (response: WorkerResponse) => void) {
  let current: { name: ModelName; model: LoadedModel } | null = null;

  async function release() {
    const held = current;
    current = null;
    await held?.model.dispose();
  }

  return {
    async handle(request: WorkerRequest): Promise<WorkerResponse> {
      const { id } = request;
      try {
        switch (request.type) {
          case 'load': {
            await release();
            const spec = specFor(request);
            const onProgress = (event: ProgressEvent) => post({ id, type: 'progress', ...event });
            const started = now();
            const model =
              spec.kind === 'gemma4' ? await loaders.gemma4(spec, onProgress) : await loaders.embedding(spec, onProgress);
            current = { name: request.model, model };
            return { id, type: 'loaded', model: request.model, loadMs: now() - started };
          }
          case 'probe': {
            if (!current) throw new Error('No model is loaded');
            const started = now();
            const result = await current.model.probe();
            return { id, type: 'probed', model: current.name, probeMs: now() - started, ...result };
          }
          case 'decide': {
            if (!current) throw new Error('No model is loaded');
            if (!current.model.decide) throw new Error('The loaded model cannot answer typed questions');
            const started = now();
            const result = await current.model.decide(request.message);
            return { id, type: 'decided', model: current.name, ...result, totalMs: now() - started };
          }
          case 'release':
            await release();
            return { id, type: 'released' };
          default:
            return { id, type: 'error', message: `Unknown request: ${request.type}` };
        }
      } catch (error) {
        return { id, type: 'error', message: messageOf(error) };
      }
    },
  };
}
