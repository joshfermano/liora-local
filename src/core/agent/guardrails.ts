// Her words reach the model only as data. These catch attempts to turn them into instructions:
// asking the model to drop its rules, play a role, or show the prompt it was given.
const INJECTION =
  /\b(?:ignore|disregard|forget|override|bypass)\b[^.?!]{0,30}\b(?:instructions?|prompts?|rules|guidelines|above|previous|prior)\b|\b(?:system|developer|hidden|initial|original)\s+(?:prompt|message|instructions?)\b|\b(?:what\s+(?:are|were)|show|reveal|print|repeat|tell\s+me|give\s+me|output)\b[^.?!]{0,20}\b(?:your|the)\s+(?:instructions?|prompts?|rules|guidelines|text\s+above|system)\b|\b(?:pretend|act|roleplay|role-play)\s+(?:you\s+are|to\s+be|as)\b|\b(?:developer|god|jailbreak|dan)\s+mode\b|\bjailbreak\b|\bkalimutan\s+mo\b[^.?!]{0,20}\b(?:utos|instructions?|rules|patakaran)\b|\bhuwag\s+mong\s+sundin\b/i;

const CONTROL =
  /<\/?(?:start_of_turn|end_of_turn|start_of_image|end_of_image|start_of_audio|end_of_audio|bos|eos|pad|unk|mask)>|<\|[^|<>]{0,40}\|>|<\/?s>|\[\/?INST\]|<<\/?SYS>>/gi;
const FENCES = /"""|<<<|>>>|```/g;
export const PROMPT_TEXT_LIMIT = 600;

export function looksLikeInjection(text: string): boolean {
  CONTROL.lastIndex = 0;
  return INJECTION.test(text) || CONTROL.test(text);
}

// What may go inside a prompt from her: no chat-template tokens that could open a new turn, none of
// the fences her words are wrapped in, and a bounded length.
export function cleanForPrompt(text: string, limit = PROMPT_TEXT_LIMIT): string {
  return text.replace(CONTROL, ' ').replace(FENCES, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}
