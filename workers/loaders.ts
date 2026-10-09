import { AutoConfig, AutoModel, AutoTokenizer, Gemma4ForCausalLM } from '@huggingface/transformers';
import type { ProgressEvent } from '../src/ai/protocol';
import { QUESTIONS } from '../src/ai/typed-decisions';
import { answerQuestions } from './decide';
import type { Loaders } from './host';

type Info = { status: string; file?: string; loaded?: number; total?: number };

function forwardProgress(onProgress: (event: ProgressEvent) => void) {
  return (info: Info) => {
    if (info.status === 'progress' && info.file && info.loaded !== undefined && info.total !== undefined) {
      onProgress({ file: info.file, loaded: info.loaded, total: info.total });
    }
  };
}

export const loaders: Loaders = {
  // Gemma4ForCausalLM loads only embed_tokens and decoder_model_merged; the audio and vision encoders are never downloaded.
  async gemma4(spec, onProgress) {
    const progress_callback = forwardProgress(onProgress);
    const tokenizer = await AutoTokenizer.from_pretrained(spec.repo, { progress_callback });
    const model = await Gemma4ForCausalLM.from_pretrained(spec.repo, {
      device: spec.device,
      dtype: spec.dtype as never,
      progress_callback,
    });
    return {
      async probe() {
        const inputs = tokenizer('Hello');
        const output = (await model.generate({ ...inputs, max_new_tokens: 1, do_sample: false } as never)) as unknown as {
          dims: number[];
        };
        return { detail: `generated 1 token; output shape [${output.dims.join(', ')}]` };
      },
      decide(message) {
        return answerQuestions(model as never, tokenizer as never, message, QUESTIONS, () => performance.now());
      },
      async dispose() {
        await model.dispose();
      },
    };
  },

  async embedding(spec, onProgress) {
    const progress_callback = forwardProgress(onProgress);
    const config = await AutoConfig.from_pretrained(spec.repo, { progress_callback });
    const loose = config as unknown as { vision_config: unknown; audio_config: unknown };
    loose.vision_config = null;
    loose.audio_config = null;
    const tokenizer = await AutoTokenizer.from_pretrained(spec.repo, { progress_callback });
    const model = await AutoModel.from_pretrained(spec.repo, {
      config,
      device: 'webgpu',
      dtype: spec.dtype as never,
      progress_callback,
    });
    return {
      async probe() {
        const inputs = tokenizer(['task: sentence similarity | query: hello world'], { padding: true });
        const output = (await model(inputs)) as { sentence_embedding: { dims: number[] } };
        const size = output.sentence_embedding.dims.at(-1) ?? 0;
        return { detail: `embedded one sentence; output shape [${output.sentence_embedding.dims.join(', ')}]`, embeddingSize: size };
      },
      async dispose() {
        await model.dispose();
      },
    };
  },
};
