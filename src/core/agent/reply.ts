import { readText } from '../lexicon';
import { DANGER_CODES, SYMPTOMS } from '../vocabulary';
import type { Facts } from './types';

// Words that make a sentence advice, reassurance or diagnosis. Gemma may only restate the facts.
const BANNED = [
  'medicine', 'medication', 'gamot', 'dose', 'dosage', 'mg', 'tablet', 'vitamin', 'vitamins', 'take', 'inumin', 'uminom',
  'ininom', 'should', 'dapat', 'must', 'kailangan', 'normal', 'abnormal', 'safe', 'unsafe', 'delikado', 'dangerous',
  'doctor', 'doktor', 'hospital', 'ospital', 'clinic', 'diagnose', 'diagnosis', 'infection', 'impeksyon', 'preeclampsia',
  'pre-eclampsia', 'eclampsia', 'miscarriage', 'anemia', 'diabetes', 'ectopic', 'gestational', 'okay ka lang',
  "you're fine", 'you are fine', "don't worry", 'do not worry', 'worry', 'worried', 'try', 'avoid', 'drink', 'eat', 'huwag',
  // reassurance: Liora never tells her something is fine
  'okay lang', "it's okay", 'it is okay', "it's fine", 'nothing to worry', 'walang dapat ipag-alala', 'no need to worry',
  'contraception', 'contraceptive', 'contraceptives', 'birth control', 'pill', 'pills', 'condom', 'iud', 'implant', 'withdrawal',
];
const BANNED_WORDS = new RegExp(`(?<![\\p{L}\\p{N}])(?:${BANNED.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}])`, 'iu');
const BANNED_ROOTS = /alala|inom|pahinga/i;
// Reassurance and advice that a word list of single words misses.
const REASSURE =
  /\b(?:fine|common|typical|harmless|serious|concern\w*|alarm\w*|reassur\w*|will\s+pass|go(?:es)?\s+away|looks?\s+good|all\s+good|no\s+need|mawawala|lilipas)\b/i;
const ADVICE =
  /\b(?:rest(?:ing)?|hydrat\w*|midwife|nurse|ob-?gyn|bhw|health\s+(?:cent(?:er|re)|worker)|emergency\s+(?:services|room|hotline|number)|911|talk\s+to|see\s+(?:a|an|your)|consult\w*|check\s+with|recommend\w*|paracetamol|acetaminophen|ibuprofen|aspirin|biogesic|mefenamic|pain\s*(?:reliever|killer)s?|painkillers?|relieve\w*|ease\s+(?:the|your))\b|\b(?:if|kapag|pag)\b.*\b(?:worse|lumala|lumubha)\b/i;
// Words that only appear when the model talks about its prompt or about her in the third person.
const LEAK =
  /\b(?:she|she's|the user|the mother|system prompt|prompt|my instructions|these instructions|the instructions|her data|what you just did|as an ai|language model|gemma)\b/i;
const wordsOf = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}']+/gu, ' ').trim().split(' ').filter(Boolean);
const ECHO_WORDS = 6;

// True when the sentence repeats six words in a row from the prompt Liora was given.
function echoes(sentence: string, secret: string): boolean {
  const hay = ` ${wordsOf(secret).join(' ')} `;
  const w = wordsOf(sentence);
  for (let i = 0; i + ECHO_WORDS <= w.length; i++) {
    if (hay.includes(` ${w.slice(i, i + ECHO_WORDS).join(' ')} `)) return true;
  }
  return false;
}

// Liora has no tool that reminds, calls, texts or tells anyone, so these are never true.
const NO_SUCH_TOOL =
  /\bremind\w*|\b(?:i(?:'ll|\s+will|\s+can)|let\s+me)\s+(?:notify|tell|call|text|message|alert|contact|send)\b|\b(?:told|notified|texted|called|messaged|alerted|contacted)\s+(?:your|her|them)\b/i;
const URL = /https?:|www\.|\b[\w-]+\.(?:com|ph|org|net|io|app|gov|edu)\b/i;
const LABELS = [...SYMPTOMS, ...DANGER_CODES];

function flat(facts: Facts): string {
  return Object.values(facts)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v) => v !== null)
    .map(String)
    .join(' | ')
    .toLowerCase()
    .replace(/_/g, ' ');
}

// Keeps the sentences of Gemma's reply that are safe to show (no medical advice, diagnosis,
// medicine, contraception advice, or any number missing from the facts); null when none are. A
// symptom may be named only when it is in the facts, that is, when she logged it herself.
// "I logged / saved / removed / updated…": only true when a tool did it this turn.
const CLAIM =
  /\b(?:i(?:'ve| have)?|i've)\s+(?:just\s+)?(?:logged|saved|added|recorded|removed|deleted|cleared|updated|changed|undone|undid|set)\b|\b(?:na-?log|nai-?log|naitala|inalis|binura|tinanggal|na-?save)\s+(?:ko|na)\b|^\s*(?:logged|saved|added|noted|recorded|done)\b|\b(?:has|have|had|was|were|is|are)\s+(?:been\s+)?(?:logged|saved|added|recorded|noted|removed|deleted|cleared|updated)\b/i;
const acted = (facts: Facts) => ['saved', 'removed', 'undone'].some((k) => {
  const v = facts[k];
  return Array.isArray(v) ? v.length > 0 : Boolean(v);
});

export function guardReply(text: string, facts: Facts, secret?: string): string | null {
  const known = flat(facts);
  const numbers = new Set(known.match(/\d+/g) ?? []);
  const didSomething = acted(facts);
  const ok = (sentence: string) => {
    if (!didSomething && CLAIM.test(sentence)) return false;
    if (NO_SUCH_TOOL.test(sentence) || REASSURE.test(sentence) || ADVICE.test(sentence)) return false;
    if (LEAK.test(sentence) || (secret && echoes(sentence, secret))) return false;
    if (URL.test(sentence) || BANNED_WORDS.test(sentence) || BANNED_ROOTS.test(sentence)) return false;
    if ((sentence.match(/\d+/g) ?? []).some((n) => !numbers.has(n))) return false;
    const lower = sentence.toLowerCase();
    if (LABELS.some((c) => lower.includes(c.replace(/_/g, ' ')) && !known.includes(c.replace(/_/g, ' ')))) return false;
    return readText(sentence).every((f) => known.includes(f.code.replace(/_/g, ' ')));
  };
  const kept = text
    .replace(/[‘’]/g, "'")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s && ok(s));
  return kept.length ? kept.join(' ') : null;
}
