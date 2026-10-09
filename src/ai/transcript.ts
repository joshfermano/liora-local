// Her box must only ever hold her words. Gemma 4 can open a reasoning channel, or answer about the task
// ("please provide the recording") when the clip is too short; neither is a transcript.
const REASONING = /<\|?channel|thinking process/i;
const ABOUT_THE_TASK =
  /\b(?:please provide|provide the (?:audio|recording)|i need the (?:audio|recording)|(?:can ?not|can't|unable to) (?:transcribe|hear)|no (?:audio|recording|speech) (?:is |was )?(?:provided|detected|found)|there is no audio|the (?:audio|recording) (?:is|was) (?:empty|silent))\b/i;

export function transcriptOnly(raw: string): string {
  const text = raw.trim();
  return REASONING.test(text) || ABOUT_THE_TASK.test(text) ? '' : text;
}
