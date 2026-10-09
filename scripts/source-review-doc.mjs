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
const where = (c) => (c.label ? `section ${c.label} (PDF page ${c.page})` : `page ${c.page}`);

const cards = candidates.map((c, i) => `### ${i + 1}. \`${c.id}\`

**Source:** ${c.citation.org}, *${c.citation.title}*, ${where(c)} ([open the page](${pdf(c.source, c.page)})) · **For:** ${c.stage} · **Linked signs:** ${codes(c.codes)}

${c.body.split('\n').map((l) => `> ${l}`).join('\n')}

${c.note}

**Fact check (2026-10-09): ${c.check.verdict}.** ${c.check.reason}

- [ ] Approve
- [ ] Reject
- Notes:
`);

const doc = `Every passage below was copied from the document by a script, not typed. On 2026-10-09 each one was also compared by hand with the page itself (layout and order included), and the linked signs were checked against what the page says. Your call decides which ones Liora shows a mother.

Each card carries a **fact check** line with a suggested answer. It is a suggestion only: you still tick Approve or Reject yourself.

## How to review (about 30 minutes)

For each card, tick **Approve** or **Reject**, and add a note if something is off. Approve only if all four are true:

1. **Copied exactly:** the words match the page (open the link to compare).
2. **Meant for the mother:** not an instruction for a health worker (no medicines, doses or procedures).
3. **Linked correctly:** the listed signs really are what the passage is about. "(new sign)" means this card would let us add that danger sign; "(please confirm)" is our interpretation.
4. **Not misleading on its own:** the short excerpt still means what the full page means.

## Questions for the team

1. **Two levels.** WHO says "go immediately, day or night" for some signs and "go to the health centre as soon as possible" for others (cards 6 and 7 for pregnancy, 13 and 14 after birth). Liora has only *go now* and *calm*. Should the second level become its own result ("go to the health centre today"), or count as *go now*?
2. **Sources that disagree.** Which one wins? The fact check suggests the more urgent one.
   - **Fever alone:** the rule Liora uses (WHO ANC.DT.01) sends her to hospital; WHO's sheet for the mother (card 7) says "as soon as possible", and its go-now list (card 6) needs "fever and too weak to get out of bed".
   - **Waters breaking:** "as soon as you can" (card 8), "as soon as possible" if not in labour after 6 hours (card 7), but "immediately" for the same 6-hour case on the delivery sheet (card 18).
   - **DOH page 4** (card 1) says "immediately" for every item, including plain vomiting, vaginal discharge and painful urination, which WHO does not list as go-now signs.
3. **Book edition.** Our Mother and Child Book is a JICA-hosted PDF with no edition printed on it; the file itself was created on 17 January 2006. If you can, compare page 4 with a current printed copy from a health centre.
4. **After birth.** Card 13 (WHO, M4) is WHO's own danger-sign list after birth. Should the after-birth rules use it, instead of applying the pregnancy rules to everyone, as they do today? If so, bleeding after birth should count only when it has increased or is heavy (card 18: "soaks more than 2-3 pads in 15 minutes"), since some bleeding is normal.
5. **New danger signs.** Should we add the "(new sign)" items these cards support: reduced baby movement, swelling of face or hands, difficulty breathing, water breaking, calf pain or swelling, chest pain? Difficulty breathing is not one of the 13 ANC.DT.01 signs, but WHO's Quick Check lists "severe difficulty breathing" (PCPNC section B2, PDF page 22).

## Candidates (${candidates.length})

${cards.join('\n')}`;

writeFileSync('sources/review.md', doc);
console.log(`wrote sources/review.md (${doc.length} chars, ${candidates.length} cards)`);
