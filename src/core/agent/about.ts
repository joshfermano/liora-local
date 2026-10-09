// Questions about Liora herself and requests she cannot meet, read by fixed patterns so the answer
// never depends on a model: who she is, that she has no internet, what she cannot do, and topics
// outside her cycle, pregnancy, the weeks after birth and this app.
export type About = 'identity' | 'offline' | 'cannot' | 'call' | 'offtopic';

const IDENTITY =
  /\bwho\s+(?:made|created|built|programmed)\s+(?:you|u)\b|\bsino\s+(?:ang\s+)?(?:gumawa|lumikha)\s+(?:sa\s+)?(?:iyo|yo|sayo)\b|\bwhat\s+can\s+(?:you|u)\s+do\b|\bano\s+(?:ang\s+)?kaya\s+mo(?:ng\s+gawin)?\b|\b(?:who|what)\s+(?:are|r)\s+(?:you|u)\b|\bsino\s+ka\b|\bano\s+ka\b|\byour\s+name\b|\bpangalan\s+mo\b|\bare\s+you\s+(?:a\s+|an\s+)?(?:bot|ai|robot|human|real|person|chat\s*gpt|gpt|gemini|siri)\b|\btao\s+ka\s+ba\b|\bbot\s+ka\s+ba\b/i;

const OFFLINE =
  /\b(?:search|google|browse|look\s+(?:it\s+)?up|lookup|internet|go\s+online|check\s+online|website)\b|\bi-?search\b|\bhanapin\s+mo\b|\b(?:weather|panahon|news|balita|headlines?|exchange\s+rate)\b/i;

const CANNOT =
  /\b(?:book|schedule|reserve)\s+(?:(?:me|an?|my)\s+){0,2}(?:appointment|check-?up|visit|consult\w*|slot)\b|\bpa-?schedule\b|\b(?:make|set)\s+(?:an?\s+|my\s+)?appointment\b|\b(?:order|buy|bilhin|i-?order|purchase|deliver)\b|\b(?:pay|bayaran|i-?bayad|send\s+money|transfer\s+money|gcash)\b|\bremind\s+me\b|\bpaalalahanan\b|\b(?:set|mag-?set)\s+(?:an?\s+)?(?:alarm|timer|reminder)\b|\b(?:email|e-?mail|i-?email|post\s+(?:on|to)|tweet)\b|\bplay\s+(?:some\s+|a\s+)?(?:music|song|video)\b|\bmagpatugtog\b/i;

// Anything about her body, health, pregnancy, cycle, feelings, daily habits or this app keeps a message
// in scope; the list is wide on purpose, so a real question is never turned away.
const RELEVANT =
  /liora|\bapp\b|calendar|\blogs?\b|profile|report|checklist|\bmood|cycle|period|regla|\bmens|dalaw|ovulat|obul|fertile|pregnan|buntis|nagdadalang|baby|sanggol|birth|panganak|nanganak|postpartum|\bweeks?\b|linggo|buwan|trimester|check-?up|discharge|bleed|dugo|pain|sakit|hurt|ache|\bulo\b|tiyan|puson|fever|lagnat|vomit|suka|nause|hilo|dizz|tired|pagod|sleep|tulog|stress|anxi|sad\b|lungkot|malungkot|happy|masaya|feel|pakiramdam|\beat\b|kain|food|pagkain|drink|inom|water|tubig|coffee|kape|exercis|ehersisyo|walk|lakad|\brest\b|pahinga|bath|ligo|hygien|breast|dede|milk|gatas|weight|timbang|body|katawan|health|kalusugan|symptom|sintomas|medicine|gamot|vitamin|doctor|doktor|nurse|midwife|komadrona|\bob\b|hospital|ospital|clinic|danger|emergency|contraction|hilab|labou?r|cramp|bloat|kabag|acne|swell|manas|maga|urin|\bihi\b|\bsex|contracep|decide|source|notes?\b|alala|remember|voice|boses/i;

// Work for a general assistant, not for Liora.
const TASK =
  /\b(?:write|compose|draft|gumawa\s+ng|sumulat\s+ng)\s+(?:me\s+)?(?:an?\s+)?(?:poem|tula|essay|story|kwento|song|kanta|letter|liham|code|program|script|report)\b|\b(?:homework|assignment|takdang[-\s]aralin|essay)\b|\b(?:solve|calculate|compute)\b|\d+\s*[x×*/+-]\s*\d+|\btranslate\b|\bisalin\b|\bjokes?\b|\bbiro\b|\brecipe\b|\bhow\s+(?:do\s+i|to)\s+(?:cook|bake)\b|\bpaano\s+(?:magluto|lutuin)\b|\b(?:python|javascript|typescript|html|css|sql)\b|\bcode\b/i;
// Friendly check-ins are small talk, never off topic.
const CHAT =
  /\b(?:how\s+are\s+(?:you|u)|how'?s\s+it\s+going|what'?s\s+up|kumusta|kamusta|musta|okay\s+ka\s+(?:lang|ba)|ayos\s+ka\s+lang|good\s+(?:morning|afternoon|evening|night))\b/i;
const QUESTION = /\?\s*$|^\s*(?:what|who|where|when|why|how|which|explain|tell\s+me\s+about|ano|sino|saan|kailan|bakit|paano|ilan|gaano)\b/i;

// A call to a hospital, doctor or ambulance: Liora cannot dial, so her own Call and Text buttons answer.
const CALL =
  /\b(?:call|phone|dial|tawagan|tumawag\s+(?:ka\s+)?(?:sa|ng))\s+(?:(?:mo|me|for\s+me|the|an?|my|ang|sa|ng)\s+){0,3}(?:hospital|ospital|doctor|doktor|ambulance|ambulansya|clinic|klinika|911|midwife|komadrona|ob|health\s+cent(?:er|re))\b/i;

export function aboutLiora(text: string): About | null {
  if (IDENTITY.test(text)) return 'identity';
  if (OFFLINE.test(text)) return 'offline';
  if (CALL.test(text)) return 'call';
  if (CANNOT.test(text)) return 'cannot';
  // A general task, or a question with nothing about her or this app in it.
  // Nothing to judge without words ("???"): left to the usual turn.
  if (!/\p{L}/u.test(text)) return null;
  if (!RELEVANT.test(text) && !CHAT.test(text) && (TASK.test(text) || QUESTION.test(text))) return 'offtopic';
  return null;
}
