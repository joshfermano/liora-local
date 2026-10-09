// Questions about Liora herself and requests she cannot meet, read by fixed patterns so the answer
// never depends on a model: who she is, that she has no internet, and what she cannot do.
export type About = 'identity' | 'offline' | 'cannot';

const IDENTITY =
  /\b(?:who|what)\s+(?:are|r)\s+(?:you|u)\b|\bsino\s+ka\b|\bano\s+ka\b|\byour\s+name\b|\bpangalan\s+mo\b|\bare\s+you\s+(?:a\s+|an\s+)?(?:bot|ai|robot|human|real|person|chat\s*gpt|gpt|gemini|siri)\b|\btao\s+ka\s+ba\b|\bbot\s+ka\s+ba\b/i;

const OFFLINE =
  /\b(?:search|google|browse|look\s+(?:it\s+)?up|lookup|internet|go\s+online|check\s+online|website)\b|\bi-?search\b|\bhanapin\s+mo\b|\b(?:weather|panahon|news|balita|headlines?|exchange\s+rate)\b/i;

const CANNOT =
  /\b(?:book|schedule|reserve)\s+(?:(?:me|an?|my)\s+){0,2}(?:appointment|check-?up|visit|consult\w*|slot)\b|\bpa-?schedule\b|\b(?:make|set)\s+(?:an?\s+|my\s+)?appointment\b|\b(?:order|buy|bilhin|i-?order|purchase|deliver)\b|\b(?:pay|bayaran|i-?bayad|send\s+money|transfer\s+money|gcash)\b|\bremind\s+me\b|\bpaalalahanan\b|\b(?:set|mag-?set)\s+(?:an?\s+)?(?:alarm|timer|reminder)\b|\b(?:email|e-?mail|i-?email|post\s+(?:on|to)|tweet)\b|\bplay\s+(?:some\s+|a\s+)?(?:music|song|video)\b|\bmagpatugtog\b/i;

export function aboutLiora(text: string): About | null {
  if (IDENTITY.test(text)) return 'identity';
  if (OFFLINE.test(text)) return 'offline';
  if (CANNOT.test(text)) return 'cannot';
  return null;
}
