// Card quotes were copied from PDFs, so a line break is often just where the page wrapped. This rejoins
// those wraps and tells the lead (a heading, the sentence that introduces a list) from the list itself,
// without adding, dropping or changing a word.
export interface ReadQuote {
  lead: string[];
  items: string[];
}

const UNFINISHED = /(?:[,;]|\b(?:the|and|or|of|to|in|a|an|with|for|at))$/i;
const TERMINAL = /[.:!?]$/;

// Prose: a line starting in lower case or "(" carries on the one before, as does one after an unfinished phrase.
function joinProse(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const prev = out.at(-1);
    if (prev !== undefined && !prev.endsWith(':') && (/^[a-z(]/.test(line) || UNFINISHED.test(prev))) out[out.length - 1] = `${prev} ${line}`;
    else out.push(line);
  }
  return out;
}

// List items: each line is one, unless it opens with "(" or the one before stops mid-phrase.
function joinItems(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const prev = out.at(-1);
    if (prev !== undefined && (line.startsWith('(') || UNFINISHED.test(prev))) out[out.length - 1] = `${prev} ${line}`;
    else out.push(line);
  }
  return out;
}

export function readQuote(quote: string): ReadQuote {
  const lines = quote.split('\n').map((l) => l.trim()).filter(Boolean);

  // A sentence ending in ":" introduces the list: everything up to it is the lead.
  const prose = joinProse(lines);
  const colon = prose.findIndex((b) => b.endsWith(':'));
  if (colon >= 0) {
    const leadText = prose.slice(0, colon + 1);
    const used = leadText.join(' ').split(/\s+/).length;
    let seen = 0;
    const rest = lines.filter((l) => (seen += l.split(/\s+/).length) > used);
    return { lead: leadText, items: joinItems(rest) };
  }

  const blocks = prose;
  if (blocks.length < 2) return { lead: blocks, items: [] };
  // A first line with no full stop before sentences is a heading.
  const heading = !TERMINAL.test(blocks[0]!) && blocks.length >= 3 ? [blocks[0]!] : [];
  const body = blocks.slice(heading.length);
  const [first, ...rest] = body;
  const listLike = rest.filter((b) => !b.endsWith('.')).length * 2 >= rest.length;
  if (first!.endsWith('.') && rest.length >= 2 && listLike) return { lead: [...heading, first!], items: rest };
  return { lead: heading, items: body };
}
