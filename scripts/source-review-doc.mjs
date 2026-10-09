// Renders sources/candidates.json as a review checklist (Markdown) for the person who approves source cards.
import { readFileSync, writeFileSync } from 'node:fs';

const candidates = JSON.parse(readFileSync('sources/candidates.json', 'utf8'));
const manifest = JSON.parse(readFileSync('sources/manifest.json', 'utf8')).sources;
const pdf = (id, page) => `${manifest.find((m) => m.id === id).url}#page=${page}`;
const label = (c) => {
  const isNew = c.startsWith('+');
  const unsure = c.endsWith('?');
  const name = c.replace(/^\+/, '').replace(/\?$/, '');
  const tags = [isNew && 'new sign', unsure && 'please confirm'].filter(Boolean);
  return tags.length ? `${name} (${tags.join(', ')})` : name;
};
const codes = (list) => (list.length ? list.map(label).join(', ') : 'none of our danger codes yet');

const cards = candidates.map((c, i) => `### ${i + 1}. \`${c.id}\`

**Source:** ${c.citation.org}, *${c.citation.title}*, page ${c.page} ([open the page](${pdf(c.source, c.page)})) · **For:** ${c.stage} · **Linked signs:** ${codes(c.codes)}

${c.body.split('\n').map((l) => `> ${l}`).join('\n')}

${c.note}

- [ ] Approve
- [ ] Reject
- Notes:
`);

const doc = `Every passage below was copied from the document by a script, not typed, and checked word for word against the PDF text. Your call decides which ones Liora shows a mother.

## How to review (about 30 minutes)

For each card, tick **Approve** or **Reject**, and add a note if something is off. Approve only if all four are true:

1. **Copied exactly:** the words match the page (open the link to compare).
2. **Meant for the mother:** not an instruction for a health worker (no medicines, doses or procedures).
3. **Linked correctly:** the listed signs really are what the passage is about. "(new sign)" means this card would let us add that danger sign; "(please confirm)" is our interpretation.
4. **Not misleading on its own:** the short excerpt still means what the full page means.

## Questions for the team

1. **Two levels.** WHO says "go immediately, day or night" for some signs and "go to the health centre as soon as possible" for others. Liora has only *go now* and *calm*. Should the second level become its own result ("go to the health centre today"), or count as *go now*?
2. **Book edition.** Our Mother and Child Book copy is hosted by JICA, edition unknown. If you can, compare page 4 with a printed copy from a health centre.
3. **After birth.** Card 13 (WHO, page 165) is WHO's own danger-sign list after birth. Should the after-birth rules use it, instead of applying the pregnancy rules to everyone, as they do today?
4. **New danger signs.** Should we add the "(new sign)" items these cards support: reduced baby movement, swelling of face or hands, difficulty breathing, water breaking, calf pain or swelling?

## Candidates (${candidates.length})

${cards.join('\n')}`;

writeFileSync('sources/review.md', doc);
console.log(`wrote sources/review.md (${doc.length} chars, ${candidates.length} cards)`);
