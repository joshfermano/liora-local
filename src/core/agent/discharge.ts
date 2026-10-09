import type { Discharge } from '../types';

// Input patterns only: how she might describe discharge, in Tagalog, Taglish or English. No advice here.
// Nothing is read unless she names discharge, or says something is coming out down there.
const MENTION =
  /\bdischarge\b|\bsecretions?\b|(?:lumalabas|tumutulo|may\s+lumabas)\b.*\b(?:ari|pwerta|puwerta|pepe|keps|vagina)\b|\b(?:ari|pwerta|puwerta|pepe|keps|vagina)\b.*\b(?:lumalabas|tumutulo)\b/i;
const NONE = /\b(?:wala(?:ng)?|walang|no|none|hindi\s+ako\s+nagka)\b[^.,;]*\bdischarge\b/i;

const COLOR: [NonNullable<Discharge['color']>, RegExp][] = [
  ['clear', /\b(?:clear|malinaw|transparent)\b/i],
  ['white', /\b(?:white|whitish|puti|puting|maputi)\b/i],
  ['yellow', /\b(?:yellow|yellowish|dilaw|madilaw)\b/i],
  ['green', /\b(?:green|greenish|berde|maberde)\b/i],
  ['grey', /\b(?:gr[ae]y|grayish|greyish|abo|kulay\s+abo)\b/i],
  ['brown', /\b(?:brown|brownish|kayumanggi|tsokolate)\b/i],
  ['pink', /\b(?:pink|pinkish|rosas|kulay\s+rosas)\b/i],
];
const TEXTURE: [NonNullable<Discharge['texture']>, RegExp][] = [
  ['egg_white', /\b(?:egg\s*white|stretchy|parang\s+(?:sipon|itlog|puti\s+ng\s+itlog)|madulas)\b/i],
  ['clumpy', /\b(?:clumpy|chunky|buo-?buo|parang\s+(?:keso|cottage)|curd(?:y|s)?)\b/i],
  ['creamy', /\b(?:creamy|parang\s+(?:gatas|cream|lotion))\b/i],
  ['sticky', /\b(?:sticky|malagkit|malapot|thick)\b/i],
  ['watery', /\b(?:watery|matubig|parang\s+tubig)\b/i],
];
const AMOUNT: [NonNullable<Discharge['amount']>, RegExp][] = [
  ['heavy', /\b(?:heavy|a\s+lot|lots|marami|madami|sobrang\s+dami)\b/i],
  ['medium', /\b(?:medium|moderate|katamtaman)\b/i],
  ['light', /\b(?:light|a\s+little|kon?ting?|kaunting?|kakaunting?|kunting?)\b/i],
];
const SMELL_NONE = /\b(?:walang\s+amoy|no\s+(?:smell|odou?r)|odou?rless|hindi\s+(?:mabaho|maamoy))\b/i;
const SMELL_UNUSUAL = /\b(?:mabaho|baho|smelly|smells?|fishy|malansa|nangangamoy|amoy|bad\s+odou?r)\b/i;

const first = <T>(table: [T, RegExp][], text: string): T | undefined => table.find(([, re]) => re.test(text))?.[0];

// The details she gave, any of them; an empty object when she only says she has discharge.
export function readDischarge(text: string): Discharge | null {
  if (!MENTION.test(text) || NONE.test(text)) return null;
  const color = first(COLOR, text);
  const texture = first(TEXTURE, text);
  const amount = first(AMOUNT, text);
  const smell = SMELL_NONE.test(text) ? 'none' : SMELL_UNUSUAL.test(text) ? 'unusual' : undefined;
  return {
    ...(color ? { color } : {}),
    ...(texture ? { texture } : {}),
    ...(amount ? { amount } : {}),
    ...(smell ? { smell } : {}),
  } as Discharge;
}
