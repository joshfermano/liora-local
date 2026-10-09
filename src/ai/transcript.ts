// Gemma 4 can still open a reasoning channel; her box must never show the model's own notes, so that is no transcript.
export function transcriptOnly(raw: string): string {
  const text = raw.trim();
  return /<\|?channel|thinking process/i.test(text) ? '' : text;
}
