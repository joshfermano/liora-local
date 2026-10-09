// Questions about Liora herself and requests she cannot meet, read by fixed patterns so the answer
// never depends on a model: who she is, that she has no internet, what she cannot do, and topics
// outside her cycle, pregnancy, the weeks after birth and this app.
export type About = 'identity' | 'offline' | 'cannot' | 'call' | 'offtopic' | 'language' | 'name' | 'love' | 'sorry' | 'howareyou';

const LANGUAGE =
  /\b(?:tagalog|taglish|filipino|pilipino|english|ingles)\s+(?:ka|po)\s+ba\b|\b(?:marunong|nakakaintindi|nakakaunawa)\s+ka\s+(?:ba\s+)?(?:ng|mag-?)?\s*(?:tagalog|taglish|filipino|english|ingles)\b|\b(?:can|do)\s+(?:you|u)\s+(?:speak|understand|talk\s+in|read)\s+(?:tagalog|taglish|filipino|english)\b|\bpwede\s+(?:ba\s+)?(?:mag-?)?tagalog\b/i;
const NAME =
  /\bwhat'?s\s+my\s+name\b|\bwhat\s+is\s+my\s+name\b|\bano\s+(?:ang\s+)?pangalan\s+ko\b|\bdo\s+you\s+know\s+my\s+name\b|\bkilala\s+mo\s+ba\s+ako\b|\balam\s+mo\s+ba\s+(?:ang\s+)?pangalan\s+ko\b/i;
const LOVE =
  /^\s*(?:i\s+love\s+(?:you|u)|love\s+(?:you|u)|mahal\s+(?:na\s+)?kita|you'?re\s+(?:the\s+best|amazing|so\s+(?:sweet|kind|helpful))|ang\s+bait\s+mo|you'?re\s+(?:awesome|great)|galing\s+mo)\b(?:\s+(?:liora|po|so\s+much|talaga))*[\s.!]*$/i;
const UPSET =
  /\b(?:you'?re|you\s+are|ang)\s+(?:so\s+)?(?:useless|stupid|dumb|bobo|walang\s+kwenta|walang\s+silbi|annoying|nakakainis)\b|\b(?:walang\s+kwenta|walang\s+silbi)\s+(?:ka|ito)\b|\bbobo\s+(?:ka|mo)\b|\byou\s+(?:don'?t|never)\s+(?:understand|help|listen)\b|\bhindi\s+mo\s+(?:ako\s+)?(?:naiintindihan|maintindihan)\b/i;
const HOW_ARE_YOU = /\b(?:kumusta|kamusta|komusta|musta)\s+ka\b|\bhow\s+are\s+(?:you|u)\b|\bhow'?s\s+it\s+going\b|\b(?:okay|ok|ayos)\s+ka\s+lang\b|\bhow\s+(?:are|r)\s+(?:you|u)\s+doing\b/i;

const IDENTITY =
  /\bbakit\s+ka\s+(?:nandito|narito|andito)\b|\bpara\s+saan\s+ka\b|\bwhat\s+are\s+you\s+for\b|\bwho\s+(?:made|created|built|programmed)\s+(?:you|u)\b|\bsino\s+(?:ang\s+)?(?:gumawa|lumikha)\s+(?:sa\s+)?(?:iyo|yo|sayo)\b|\bwhat\s+can\s+(?:you|u)\s+do\b|\bano\s+(?:ang\s+)?kaya\s+mo(?:ng\s+gawin)?\b|\b(?:who|what)\s+(?:are|r)\s+(?:you|u)\b|\bsino\s+ka\b|\bano\s+ka\b|\byour\s+name\b|\bpangalan\s+mo\b|\bare\s+you\s+(?:a\s+|an\s+)?(?:bot|ai|robot|human|real|person|chat\s*gpt|gpt|gemini|siri)\b|\btao\s+ka\s+ba\b|\bbot\s+ka\s+ba\b/i;

const OFFLINE =
  /\b(?:search|google|browse|look\s+(?:it\s+)?up|lookup|internet|go\s+online|check\s+online|website)\b|\bi-?search\b|\bhanapin\s+mo\b|\b(?:weather|panahon|news|balita|headlines?|exchange\s+rate)\b/i;

const CANNOT =
  /\b(?:book|schedule|reserve)\s+(?:(?:me|an?|my)\s+){0,2}(?:appointment|check-?up|visit|consult\w*|slot)\b|\bpa-?schedule\b|\b(?:make|set)\s+(?:an?\s+|my\s+)?appointment\b|\b(?:order|buy|bilhin|i-?order|purchase|deliver)\b|\b(?:pay|bayaran|i-?bayad|send\s+money|transfer\s+money|gcash)\b|\bremind\s+me\b|\bpaalalahanan\b|\b(?:set|mag-?set)\s+(?:an?\s+)?(?:alarm|timer|reminder)\b|\b(?:email|e-?mail|i-?email|post\s+(?:on|to)|tweet)\b|\bplay\s+(?:some\s+|a\s+)?(?:music|song|video)\b|\bmagpatugtog\b/i;

// Anything about her body, health, pregnancy, cycle, feelings, daily habits or this app keeps a message
// in scope; the list is wide on purpose, so a real question is never turned away.
const RELEVANT =
  /liora|\bapp\b|calendar|\blogs?\b|profile|report|checklist|\bmood|cycle|period|regla|\bmens|dalaw|ovulat|obul|fertile|pregnan|buntis|nagdadalang|baby|sanggol|birth|panganak|nanganak|manganak|allerg|manganganak|\bdue\b|kabuwanan|tahi|stitch|sugat|wound|\bcs\b|c-?section|postpartum|\bweeks?\b|linggo|buwan|trimester|check-?up|discharge|bleed|dugo|pain|sakit|hurt|ache|\bulo\b|tiyan|puson|fever|lagnat|vomit|suka|nause|hilo|dizz|tired|pagod|sleep|tulog|stress|anxi|sad\b|lungkot|malungkot|happy|masaya|feel|pakiramdam|\beat\b|kain|food|pagkain|drink|inom|water|tubig|coffee|kape|exercis|ehersisyo|walk|lakad|\brest\b|pahinga|bath|ligo|hygien|breast|dede|milk|gatas|weight|timbang|body|katawan|health|kalusugan|symptom|sintomas|medicine|gamot|vitamin|doctor|doktor|nurse|midwife|komadrona|\bob\b|hospital|ospital|clinic|danger|emergency|contraction|hilab|labou?r|cramp|bloat|kabag|acne|swell|manas|maga|urin|\bihi\b|\bsex|contracep|decide|source|notes?\b|alala|remember|voice|boses/i;

// Work for a general assistant, not for Liora.
const TASK =
  /\bgawan\s+mo\s+(?:ako\s+)?(?:ng\s+)?(?:tula|kwento|kanta|sanaysay|essay|poem|story|song)\b|\b(?:write|compose|draft|gumawa\s+ng|sumulat\s+ng)\s+(?:me\s+)?(?:an?\s+)?(?:poem|tula|essay|story|kwento|song|kanta|letter|liham|code|program|script|report)\b|\b(?:homework|assignment|takdang[-\s]aralin|essay)\b|\b(?:solve|calculate|compute)\b|\d+\s*[x×*/+-]\s*\d+|\btranslate\b|\bisalin\b|\bjokes?\b|\bbiro\b|\brecipe\b|\bhow\s+(?:do\s+i|to)\s+(?:cook|bake)\b|\bpaano\s+(?:magluto|lutuin)\b|\b(?:python|javascript|typescript|html|css|sql)\b|\bcode\b/i;
// Friendly check-ins and asking for help are never off topic.
const CHAT =
  /\bano\s+(?:ang\s+)?dapat\s+(?:kong\s+)?gawin\b|\bano(?:ng)?\s+(?:ang\s+)?gagawin\s+ko\b|\bwhat\s+should\s+i\s+do\b|^\s*(?:please\s+)?help\s+me(?:\s+please)?[\s.!?]*$|^\s*tulungan\s+mo\s+(?:ako|po\s+ako)?[\s.!?]*$|\b(?:how\s+are\s+(?:you|u)|how'?s\s+it\s+going|what'?s\s+up|kumusta|kamusta|musta|okay\s+ka\s+(?:lang|ba)|ayos\s+ka\s+lang|good\s+(?:morning|afternoon|evening|night))\b/i;
const QUESTION = /\?\s*$|^\s*(?:what|who|where|when|why|how|which|explain|tell\s+me\s+about|ano|sino|saan|kailan|bakit|paano|ilan|gaano)\b/i;

// A call to a hospital, doctor or ambulance: Liora cannot dial, so her own Call and Text buttons answer.
const CALL =
  /\b(?:call|phone|dial|tawagan|tumawag\s+(?:ka\s+)?(?:sa|ng))\s+(?:(?:mo|me|for\s+me|the|an?|my|ang|sa|ng)\s+){0,3}(?:hospital|ospital|doctor|doktor|ambulance|ambulansya|clinic|klinika|911|midwife|komadrona|ob|health\s+cent(?:er|re))\b/i;

export function aboutLiora(text: string): About | null {
  if (NAME.test(text)) return 'name';
  if (LANGUAGE.test(text)) return 'language';
  if (LOVE.test(text)) return 'love';
  if (UPSET.test(text)) return 'sorry';
  if (IDENTITY.test(text)) return 'identity';
  if (OFFLINE.test(text)) return 'offline';
  if (CALL.test(text)) return 'call';
  if (CANNOT.test(text)) return 'cannot';
  if (HOW_ARE_YOU.test(text)) return 'howareyou';
  // A general task, or a question with nothing about her or this app in it.
  // Nothing to judge without words ("???"): left to the usual turn.
  if (!/\p{L}/u.test(text)) return null;
  if (!RELEVANT.test(text) && !CHAT.test(text) && (TASK.test(text) || QUESTION.test(text))) return 'offtopic';
  return null;
}

// A plea for help with nothing else in it: Liora answers with what she can do, not small talk.
const HELP = /\bano\s+(?:ang\s+)?dapat\s+(?:kong\s+)?gawin\b|\bano(?:ng)?\s+(?:ang\s+)?gagawin\s+ko\b|\bwhat\s+should\s+i\s+do\b|^\s*(?:please\s+)?help\s+me(?:\s+please)?[\s.!?]*$|^\s*tulungan\s+mo\s+(?:ako|po\s+ako)?[\s.!?]*$/i;

export function asksForHelp(text: string): boolean {
  return HELP.test(text);
}
