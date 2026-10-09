// Input patterns only: words for losing a pregnancy, in Tagalog, Taglish or English.
const LOSS =
  /\bnakunan\b|\bnaku-?nan\b|\bnalaglag\s+(?:ang\s+)?(?:baby|bata|anak|dinadala)|\bmiscarr(?:y|ied|iage)\b|\blost\s+(?:my|the|our)\s+(?:baby|pregnancy)\b|\bnawala\s+(?:ang\s+)?(?:baby|anak|dinadala)\b/i;
const ASKS = /\?|\bpaano\b|\bhow\b|\bwhat\b|\bano\b|\bsigns?\b|\bsenyales\b|\biwas\b|\bavoid\b|\bprevent\b/i;

// She says it happened to her, not asks about it ("paano maiiwasan ang nakunan?" stays a health question).
export function mentionsLoss(text: string): boolean {
  return LOSS.test(text) && !ASKS.test(text);
}
