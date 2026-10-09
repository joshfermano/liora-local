import { DynamicCache, Tensor } from '@huggingface/transformers';
import { optionTokenIds, promptFor, restrictedSoftmax, splitPrefix, type Question } from '../src/ai/typed-decisions';
import type { Decided } from './host';

type Tokenizer = {
  apply_chat_template(messages: { role: string; content: string }[], options: object): unknown;
  encode(text: string, options: { add_special_tokens: boolean }): number[];
};
type Outputs = Record<string, Tensor>;
type Model = { forward(inputs: Record<string, unknown>): Promise<Outputs> };

const ids = (tokens: number[]) => new Tensor('int64', BigInt64Array.from(tokens, BigInt), [1, tokens.length]);
const ones = (length: number) => new Tensor('int64', new BigInt64Array(length).fill(1n), [1, length]);
const lastOnly = () => new Tensor('int64', BigInt64Array.from([1n]), []);

function lastLogits(outputs: Outputs) {
  if (!outputs.logits) throw new Error('The model returned no logits');
  const logits = outputs.logits.to('float32');
  const vocab = logits.dims.at(-1)!;
  const data = logits.data as Float32Array;
  return data.subarray(data.length - vocab);
}

function cacheFrom(outputs: Outputs) {
  const entries: Record<string, Tensor> = {};
  for (const name in outputs) {
    const tensor = outputs[name];
    if (tensor && name.startsWith('present')) entries[name.replace('present', 'past_key_values')] = tensor;
  }
  return new DynamicCache(entries);
}

function disposeGpu(outputs: Outputs) {
  for (const tensor of Object.values(outputs)) if (tensor.location === 'gpu-buffer') tensor.dispose();
}

// Her message is run once; every question then continues from that cached prefix (SemIf method).
export async function answerQuestions(
  model: Model,
  tokenizer: Tokenizer,
  message: string,
  questions: Question[],
  now: () => number,
): Promise<Decided> {
  const encode = (text: string) => tokenizer.encode(text, { add_special_tokens: false });
  const sequences = questions.map((q) =>
    encode(
      tokenizer.apply_chat_template([{ role: 'user', content: promptFor(message, q) }], {
        add_generation_prompt: true,
        tokenize: false,
      }) as string,
    ),
  );
  const { prefix, suffixes } = splitPrefix(sequences);
  const options = new Map<readonly string[], number[][]>();
  for (const q of questions) if (!options.has(q.options)) options.set(q.options, optionTokenIds(encode, q.options));

  const started = now();
  const prefill = await model.forward({ input_ids: ids(prefix), attention_mask: ones(prefix.length), num_logits_to_keep: lastOnly() });
  const cache = cacheFrom(prefill);
  const prefixMs = now() - started;

  const answers: Record<string, number[]> = {};
  try {
    for (const [i, q] of questions.entries()) {
      const suffix = suffixes[i] ?? [];
      const outputs = await model.forward({
        input_ids: ids(suffix),
        attention_mask: ones(prefix.length + suffix.length),
        past_key_values: cache,
        num_logits_to_keep: lastOnly(),
      });
      answers[q.id] = restrictedSoftmax(lastLogits(outputs), options.get(q.options) ?? []);
      disposeGpu(outputs);
    }
  } finally {
    await cache.dispose();
  }
  return { answers, prefixTokens: prefix.length, prefixMs };
}
