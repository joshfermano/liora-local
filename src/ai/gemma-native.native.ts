import { File, Paths } from 'expo-file-system';
import { initLlama } from 'llama.rn';
import { GEMMA_GGUF, type NativeGemma } from './gemma-native';
import { logScoresFromTopProbs, optionTokenIds, promptFor, QUESTIONS, restrictedSoftmax } from './typed-decisions';

export { GEMMA_GGUF, type NativeGemma } from './gemma-native';

const model = () => new File(Paths.document, GEMMA_GGUF.file);

export function modelBytesOnDisk(): number {
  const file = model();
  return file.exists ? (file.size ?? 0) : 0;
}

export async function downloadModel(onProgress: (written: number, total: number) => void): Promise<void> {
  await File.downloadFileAsync(GEMMA_GGUF.url, model(), {
    idempotent: true,
    onProgress: ({ bytesWritten, totalBytes }) => onProgress(bytesWritten, totalBytes),
  });
}

export async function loadGemma(): Promise<NativeGemma> {
  const started = Date.now();
  const ctx = await initLlama({ model: model().uri, n_ctx: 1024, n_gpu_layers: 99, use_mmap: true, use_mlock: false });
  const loadMs = Date.now() - started;

  // tokenize('') reveals a start token the tokenizer adds, which is not part of a spelling.
  const [start] = (await ctx.tokenize('')).tokens;
  const spellings = new Map<string, number[]>();
  for (const q of QUESTIONS) {
    for (const option of q.options) {
      const capital = option.charAt(0).toUpperCase() + option.slice(1);
      for (const s of [option, ` ${option}`, capital, ` ${capital}`]) {
        if (spellings.has(s)) continue;
        const { tokens } = await ctx.tokenize(s);
        spellings.set(s, start !== undefined && tokens[0] === start ? tokens.slice(1) : tokens);
      }
    }
  }
  const optionIds = new Map<readonly string[], number[][]>();
  for (const q of QUESTIONS) {
    if (!optionIds.has(q.options)) optionIds.set(q.options, optionTokenIds((s) => spellings.get(s) ?? [], q.options));
  }

  return {
    loadMs,
    gpu: ctx.gpu,
    reasonNoGPU: ctx.reasonNoGPU,
    async decide(message) {
      const t = Date.now();
      const answers: Record<string, number[]> = {};
      const skipped: string[] = [];
      for (const q of QUESTIONS) {
        const chat = await ctx.getFormattedChat([{ role: 'user', content: promptFor(message, q) }], null, {
          jinja: true,
          add_generation_prompt: true,
          enable_thinking: false,
        });
        const result = await ctx.completion({
          prompt: chat.prompt,
          n_predict: 1,
          n_probs: 50,
          post_sampling_probs: false,
          temperature: 0,
        });
        try {
          const top = result.completion_probabilities?.[0]?.probs ?? [];
          answers[q.id] = restrictedSoftmax(logScoresFromTopProbs(top), optionIds.get(q.options) ?? []);
        } catch {
          skipped.push(q.id);
        }
      }
      return { answers, skipped, ms: Date.now() - t };
    },
    release: () => ctx.release(),
  };
}
