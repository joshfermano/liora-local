// Her box must only ever hold her words. Gemma 4 can open a reasoning channel, or answer about the task
// ("please provide the recording") when the clip is too short; neither is a transcript.
const REASONING = /<\|?channel|thinking process/i;
const ABOUT_THE_TASK =
  /\b(?:please provide|provide the (?:audio|recording)|i need the (?:audio|recording)|(?:can ?not|can't|unable to) (?:transcribe|hear)|no (?:audio|recording|speech) (?:is |was )?(?:provided|detected|found)|there is no audio|the (?:audio|recording) (?:is|was) (?:empty|silent))\b/i;

export function transcriptOnly(raw: string): string {
  const text = raw.trim();
  return REASONING.test(text) || ABOUT_THE_TASK.test(text) ? '' : text;
}

// A clip this short holds no words; Gemma then answers about the audio instead of writing it down.
export const MIN_CLIP_MS = 600;

const ABOUT_THE_AUDIO =
  /\b(?:provide|share|send|upload)\b.{0,30}\b(?:recording|audio)\b|\baudio file\b|\btranscribe it\b|\b(?:no|any) (?:speech|audio|words)\b|\bcannot hear\b|\bcan't hear\b|\bthe recording you\b/i;

// What Liora treats as words she said: nothing from a clip too short to hold speech, and nothing
// when the model talks about the recording instead of writing it down.
export function heardWords(text: string, clipMs: number): string | null {
  if (clipMs < MIN_CLIP_MS) return null;
  const words = transcriptOnly(text).replace(/^["'“”]+|["'“”]+$/g, '').trim();
  if (!words || ABOUT_THE_AUDIO.test(words)) return null;
  return words;
}
