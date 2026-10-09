import { File, Paths } from 'expo-file-system';
import { initLlama } from 'llama.rn';
import { GEMMA_GGUF, GEMMA_VOICE, type NativeGemma } from './gemma-model';
import { INTENT_OPTIONS, intentPrompt } from './intent';
import { withRetries } from './retry';
import { PROVISIONAL_THRESHOLDS } from '../core/merge';
import { transcriptOnly } from './transcript';
import {
  followUpQuestions,
  logScoresFromTopProbs,
  optionTokenIds,
  PRESENCE,
  promptFor,
  QUESTIONS,
  restrictedSoftmax,
  type Question,
} from './typed-decisions';

export { GEMMA_GGUF, GEMMA_VOICE, type NativeGemma } from './gemma-model';

const model = () => new File(Paths.document, GEMMA_GGUF.file);
const voiceModel = () => new File(Paths.document, GEMMA_VOICE.file);
const bytes = (file: File) => (file.exists ? (file.size ?? 0) : 0);

export function modelBytesOnDisk(): number {
  return bytes(model());
}

export function voiceBytesOnDisk(): number {
  return bytes(voiceModel());
}

export async function downloadVoice(onProgress: (written: number, total: number) => void): Promise<void> {
  await withRetries(
    () =>
      File.downloadFileAsync(GEMMA_VOICE.url, voiceModel(), {
        idempotent: true,
        onProgress: ({ bytesWritten, totalBytes }) => onProgress(bytesWritten, totalBytes),
      }),
    { attempts: 3 },
  );
}

const TRANSCRIBE =
  'Write down exactly what is said in this recording, word for word, in the language it is spoken ' +
  '(Tagalog, Taglish, Cebuano or English). Write only the words that are said.';

// A 2.7 GB download over home Wi-Fi drops now and then ("network connection was lost" on the phone).
export async function downloadModel(onProgress: (written: number, total: number) => void): Promise<void> {
  await withRetries(
    () =>
      File.downloadFileAsync(GEMMA_GGUF.url, model(), {
        idempotent: true,
        onProgress: ({ bytesWritten, totalBytes }) => onProgress(bytesWritten, totalBytes),
      }),
    { attempts: 3 },
  );
}

export async function loadGemma(): Promise<NativeGemma> {
  const started = Date.now();
  const ctx = await initLlama({ model: model().uri, n_ctx: 1024, n_gpu_layers: 99, use_mmap: true, use_mlock: false });
  const voice = voiceBytesOnDisk() > 0 && (await ctx.initMultimodal({ path: voiceModel().uri, use_gpu: true }));
  const loadMs = Date.now() - started;

  // tokenize('') reveals a start token the tokenizer adds, which is not part of a spelling.
  const [start] = (await ctx.tokenize('')).tokens;
  const spellings = new Map<string, number[]>();
  for (const options of [...QUESTIONS.map((q) => q.options), INTENT_OPTIONS]) {
    for (const option of options) {
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
  const intentIds = optionTokenIds((s) => spellings.get(s) ?? [], INTENT_OPTIONS);

  // A late answer is abandoned and the context is freed for the next call.
  const within = async <T>(run: Promise<T>, ms: number): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('The model took too long'));
        // stopCompletion's typing says Promise, but the native call can return nothing.
        try {
          void Promise.resolve(ctx.stopCompletion()).catch(() => {});
        } catch {}
      }, ms);
    });
    try {
      return await Promise.race([run, timeout]);
    } finally {
      clearTimeout(timer);
    }
  };

  const scoreOptions = async (content: string, ids: number[][]) => {
    const chat = await ctx.getFormattedChat([{ role: 'user', content }], null, {
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
    return restrictedSoftmax(logScoresFromTopProbs(result.completion_probabilities?.[0]?.probs ?? []), ids);
  };

  return {
    loadMs,
    gpu: ctx.gpu,
    reasonNoGPU: ctx.reasonNoGPU,
    voice,
    // A transcript of her own words, shown in the editable box before anything is decided (FR-3).
    async transcribe(wavUri) {
      if (!voice) throw new Error('The voice add-on is not loaded');
      const t = Date.now();
      const result = await ctx.completion({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: TRANSCRIBE },
              { type: 'input_audio', input_audio: { format: 'wav', url: wavUri } },
            ],
          },
        ],
        n_predict: 160,
        temperature: 0,
        jinja: true,
        enable_thinking: false,
      });
      return { text: transcriptOnly(result.text), ms: Date.now() - t };
    },
    async decide(message) {
      const t = Date.now();
      const answers: Record<string, number[]> = {};
      const skipped: string[] = [];
      const ask = async (q: Question) => {
        try {
          answers[q.id] = await scoreOptions(promptFor(message, q), optionIds.get(q.options) ?? []);
        } catch (error) {
          // A failed run still fails the whole answer; only an unscorable question is skipped.
          if (!(error instanceof Error) || !error.message.startsWith('None of the options')) throw error;
          skipped.push(q.id);
        }
      };
      for (const q of PRESENCE) await ask(q);
      for (const q of followUpQuestions(answers, PROVISIONAL_THRESHOLDS)) await ask(q);
      return { answers, skipped, ms: Date.now() - t };
    },
    // Only routes the companion's reply; the danger questions above still decide nothing alone.
    async intent(message) {
      const t = Date.now();
      return { probs: await scoreOptions(intentPrompt(message), intentIds), ms: Date.now() - t };
    },
    async json(prompt, schema, opts) {
      const run = ctx.completion({
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_schema', json_schema: { strict: true, schema } },
        enable_thinking: false,
        n_predict: 160,
        temperature: 0,
      });
      return JSON.parse((await within(run, opts?.timeoutMs ?? 4000)).text.trim());
    },
    async say(messages, { nPredict, temperature, timeoutMs = 3000, onToken }) {
      let streamed = '';
      const run = ctx.completion(
        { messages, enable_thinking: false, n_predict: nPredict, temperature, stop: ['\n'] },
        (data) => {
          streamed = data.accumulated_text ?? streamed + data.token;
          onToken?.(streamed);
        },
      );
      return (await within(run, timeoutMs)).text.trim();
    },
    release: () => ctx.release(),
  };
}
