// Input patterns only: good news she shares about her baby or a check-up.
const GOOD =
  /\b(?:sumipa|sumisipa|gumalaw|gumagalaw|kumilos)\b.*\b(?:baby|bata)\b|\b(?:baby|bata)\b.*\b(?:sumipa|sumisipa|gumalaw|gumagalaw|kicked|kicks|kicking|moved|moving)\b|\b(?:okay|ok|maayos|healthy|malusog)\s+(?:daw|naman|raw)\s+(?:si\s+|ang\s+)?(?:baby|bata)|\bbaby\s+(?:is|was)\s+(?:fine|healthy|okay|ok|doing\s+(?:well|great))\b|\bgood\s+news\b|\bnarinig\s+ko\s+(?:ang\s+)?heartbeat|\bheard\s+(?:the\s+|my\s+)?(?:baby'?s\s+)?heartbeat/i;
const NOT = /\b(?:hindi|di|not|no|less|fewer|wala|walang|bihira|hasn'?t|didn'?t|stopped|tumigil)\b/i;

export function goodNews(text: string): boolean {
  return GOOD.test(text) && !NOT.test(text);
}
