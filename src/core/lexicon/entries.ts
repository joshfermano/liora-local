import type { DangerCode, Mood, Symptom } from '../types';

// Input patterns only: what a mother might type. No advice, no medical claims.
// Which code a phrase maps to is the WHO ANC.DT.01 danger sign list in vocabulary.ts.
export interface Entry {
  pattern: RegExp;
  codes: (DangerCode | Symptom)[];
}

const HEAD_PAIN =
  /\b(?:(?:masakit|sakit|kirot|kumikirot)\s+(?:(?:lang|na|talaga|pa)\s+)?(?:ng\s+|ang\s+)?ulo|ulo\s+(?:ko\s+)?(?:ay\s+)?(?:masakit|kumikirot)|headaches?|migraine)\b/i;
const BELLY_PAIN =
  /\b(?:(?:masakit|sakit|kirot|kumikirot)\s+(?:(?:lang|na|talaga|pa)\s+)?(?:ng\s+|ang\s+|sa\s+)?tiyan|tiyan\s+(?:ko\s+)?(?:ay\s+)?masakit|(?:stomach|abdominal|belly|tummy)\s*(?:pain|ache)s?|stomachache)\b/i;

export const ENTRIES: Entry[] = [
  { pattern: HEAD_PAIN, codes: ['severe_headache', 'headache'] },
  { pattern: BELLY_PAIN, codes: ['severe_abdominal_pain'] },
  {
    pattern: /dinudugo|dumudugo|nagdudugo|pagdurugo|duguan|\bmay dugo\b|(?:sobrang|maraming|ang\s+daming|madaming)\s+dugo|\bbleeding\b|\bbleed\b|\b(?:see|saw|seeing) blood\b/i,
    codes: ['vaginal_bleeding'],
  },
  {
    pattern: /kumbulsyon|kombulsyon|convuls|seizure|naninigas|nangisay|nangingisay|kinombulsyon|\bfits?\b/i,
    codes: ['convulsions'],
  },
  { pattern: /lagnat|\bsinat\b|\bfever\b|febrile/i, codes: ['fever'] },
  {
    pattern:
      /hirap\s+(?:na\s+hirap\s+)?(?:akong\s+|ako\s+|na\s+|ng\s+)?(?:huminga|makahinga|paghinga)|hindi\s+(?:ako\s+)?makahinga|kinakapos\s+(?:ang\s+|ng\s+|sa\s+)?(?:hininga|paghinga)|hinihingal|(?:can'?t|cannot|hard\s+to|trouble|difficulty)\s+breath(?:e|ing)|short(?:ness)?\s+of\s+breath/i,
    codes: ['severe_difficulty_breathing'],
  },
  {
    pattern:
      /malabo\s+(?:ang\s+|na\s+|ng\s+)?(?:paningin|mata)|nanlalabo|nandidilim\s+ang\s+(?:paningin|mata)|blurr?(?:y|ed)\s+vision|vision\s+(?:is\s+)?blurr|double vision|seeing\s+(?:spots|stars|flashing)|\b(?:can'?t|cannot|can\s+not)\s+see\b|(?:hindi|di)\s+(?:na\s+)?(?:ako\s+)?(?:na\s+)?makakita|nawalan\s+(?:ako\s+)?ng\s+paningin|lost\s+(?:my\s+)?(?:sight|vision)/i,
    codes: ['visual_disturbance'],
  },
  {
    pattern:
      /lumalabas\s+na\b.*\b(?:baby|bata|sanggol|ulo)\b|lalabas\s+na\s+(?:si\s+|ang\s+)?(?:baby|bata|sanggol)|crowning|baby'?s?\s+(?:is\s+)?(?:coming out|head)/i,
    codes: ['imminent_delivery'],
  },
  {
    pattern:
      /nanganganak|naglalabor|manganganak\s+na|\blabou?r\b|contractions?|humihilab|panubigan|water\s+(?:broke|broken)/i,
    codes: ['labour'],
  },
  {
    pattern:
      /\bhina\s+(?:niya|ko|ng katawan)\b|nanghihina\s+na|(?:hindi|di)\s+(?:na\s+)?makatayo|very\s+(?:sick|ill)\b/i,
    codes: ['looks_very_ill'],
  },
  {
    pattern: /suka\s+(?:nang|ng)\s+suka|sumusuka|nagsusuka|vomit/i,
    codes: ['severe_vomiting'],
  },
  {
    pattern:
      /(?:severe|unbearable|intense)\s+pain|matinding\s+sakit(?!\s+(?:ng|sa|ang)\b)|(?:hindi|di)\s+(?:ko\s+)?matiis|sakit\s+na\s+sakit|\b(?:sobrang|grabeng|grabe\s+ang)\s+sakit\b(?!\s+(?:ng|sa|ang)\b)/i,
    codes: ['severe_pain'],
  },
  {
    pattern:
      /hinimatay|nahimatay|nawalan\s+(?:ako\s+|siya\s+|sya\s+)?ng\s+(?:malay|ulirat)|walang\s+malay|unconscious|passed\s+out|(?:hindi|di)\s+(?:na\s+)?magising/i,
    codes: ['unconscious'],
  },
  {
    pattern:
      /nangingitim\s+(?:ang\s+|na\s+)?(?:labi|mukha|kuko)|(?:asul|bughaw)\s+(?:ang\s+|na\s+)?(?:labi|mukha)|(?:blue|bluish)\s+(?:lips|face|fingernails)|cyanosis/i,
    codes: ['central_cyanosis'],
  },
  { pattern: /balakang|likod|back\s*pain|backache/i, codes: ['back_pain'] },
  { pattern: /puson|pelvic/i, codes: ['pelvic_pain'] },
  { pattern: /\bcramps?\b|dysmenorrh/i, codes: ['cramps'] },
  { pattern: /nasusuka|naduduwal|nausea|nauseous/i, codes: ['nausea'] },
  { pattern: /bloat|kabag|busog na busog/i, codes: ['bloating'] },
  { pattern: /pagod|fatigue|exhaust|\bhapo\b/i, codes: ['fatigue'] },
  {
    pattern: /mood\s+(?:swings?|changes?)|paiba-iba\s+(?:ang\s+)?(?:mood|ugali)/i,
    codes: ['mood_changes'],
  },
  { pattern: /\bacne\b|pimple|tigyawat/i, codes: ['acne'] },
  {
    pattern:
      /(?:masakit|sakit|kirot|sore|tender)\b.*\b(?:dede|suso|breasts?)\b|\b(?:dede|suso|breasts?)\b.*\b(?:masakit|sore|tender)|breast\s+(?:tender|pain)/i,
    codes: ['breast_tenderness'],
  },
  {
    pattern:
      /(?:hindi|di)\s+(?:ako\s+)?makatulog|walang\s+tulog|\bpuyat\b|insomnia|(?:can'?t|cannot)\s+sleep|trouble\s+sleeping|poor\s+sleep/i,
    codes: ['sleep_quality'],
  },
  { pattern: /walang\s+(?:energy|lakas)|(?:low|no)\s+energy/i, codes: ['energy'] },
  { pattern: /stress/i, codes: ['stress'] },
  {
    pattern: /walang\s+(?:gana|ganang|appetite)|(?:no|loss of|poor)\s+appetite|ayaw\s+kumain/i,
    codes: ['appetite'],
  },
];

export const MOOD_ENTRIES: { pattern: RegExp; mood: Mood }[] = [
  { pattern: /\bmasaya\b|\bsaya\b|joyful|\bhappy\b/i, mood: 'joyful' },
  { pattern: /kalmado|payapa|\bcalm\b|relaxed/i, mood: 'calm' },
  { pattern: /masigla|energetic/i, mood: 'energetic' },
  { pattern: /romantic|malambing/i, mood: 'romantic' },
  { pattern: /pagod|\btired\b|exhaust|\bpuyat\b/i, mood: 'tired' },
  { pattern: /kinakabahan|nababahala|nag-aalala|balisa|anxious|worried|anxiety/i, mood: 'anxious' },
  { pattern: /stress/i, mood: 'stressed' },
  { pattern: /irritable|iritable|naiirita|\binis\b|mainit ang ulo/i, mood: 'irritable' },
  { pattern: /malungkot|lungkot|\bsad\b/i, mood: 'sad' },
];

export const SEVERE_CUE =
  /\b(?:sever|sobrang|grabe|grabeng|napaka\w*|matindi|matinding|severe|severely|really bad)\b/i;
export const MILD_CUE =
  /\b(?:medyo|konti|konting|kaunti|kaunting|bahagya|slight|slightly|a bit|a little)\b/i;
