// Whether her message asks something, in Tagalog, Taglish or English, with or without a question mark.
// "do i have ovulation" and "may regla ba ako" ask; "did yoga today" and "do i log it" are read by shape:
// an English helper verb counts only when a person or "my" follows it.
const MARK = /\?\s*$|\?/;
const PARTICLE = /\bba\b/i;
const TAGALOG = /^\s*(?:ano|anong|ano'ng|bakit|paano|pano|kailan|kelan|ilang|ilan|gaano|sino|saan|nasaan|alin|pwede|puwede|pede|meron\s+ba|may\s+\w+\s+ba)\b/i;
const ENGLISH_WORD = /^\s*(?:what|what's|whats|why|how|when|where|who|which|whose)\b/i;
const ENGLISH_HELPER =
  /^\s*(?:(?:hey|hi|liora|please|so|and|but|ok(?:ay)?)[,\s]+)*(?:do(?!\s+(?:it|this|that|so)\b)|does|did|am|is|are|was|were|will|would|can|could|should|shall|have|has|had|may|might|must)\s+(?:i|my|me|it|this|that|there|you|u|we|they|she|he|the|a|an)\b/i;

export function isQuestion(text: string): boolean {
  return MARK.test(text) || PARTICLE.test(text) || TAGALOG.test(text) || ENGLISH_WORD.test(text) || ENGLISH_HELPER.test(text);
}
