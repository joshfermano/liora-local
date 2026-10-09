// Later turns go straight to the answer: a leading hello and her name are dropped, the rest kept.
const OPENER =
  /^\s*(?:hi|hello|hey|hiya|kumusta|kamusta|musta|good\s+(?:morning|afternoon|evening|day)|magandang\s+(?:umaga|hapon|gabi|araw))\b(?:\s+there\b)?/i;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function withoutGreeting(text: string, name?: string): string | null {
  let out = text.trim().replace(OPENER, '').replace(/^[\s,.!?…]+/, '');
  if (name) out = out.replace(new RegExp(`^${escape(name)}\\b[\\s,.!?…]*`, 'i'), '');
  out = out.replace(/^[\s,.!?…]+/, '');
  if (!out) return null;
  return out[0]!.toUpperCase() + out.slice(1);
}
