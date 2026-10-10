// The JSON in a model reply. Even with a schema, Gemma 4 through llama.rn can wrap it in a markdown
// fence ("```json … ```") or put a token before it; the schema check after this still decides.
export function jsonFrom(raw: string): unknown {
  const text = raw.trim();
  try {
    return JSON.parse(text);
  } catch {
    /* look inside */
  }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]!.trim());
    } catch {
      /* fall through */
    }
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error('No JSON in the model reply');
}
