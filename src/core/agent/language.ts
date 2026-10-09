export type Language = 'tagalog' | 'english' | 'taglish';

const RECENT = 10;

// Common function words only, enough to tell which language she types in. Words that mean something
// in both (may, no, at, to, na, ko in names) are left out on purpose.
const TAGALOG = new Set(
  `ako ko mo ka siya kami namin natin kayo sila ang ng sa ay po opo naman yung iyong lang hindi hindi di wala walang
   pero kasi kaya ba din rin pa pang mga ito iyan iyon dito doon ngayon kanina bukas kahapon mamaya sobrang medyo
   talaga siguro gusto ayaw ayoko puwede pwede paano bakit kailan ano saan sino masakit pagod puson ulo regla
   niregla nagka tapos nang salamat kumusta musta magandang umaga gabi nakatulog makatulog naglakad uminom
   tandaan kalimutan lahat kamusta komusta nag mag kaba oo sige ikaw alam sabi nga eh daw raw diba sana muna ulit wag
   huwag tagalog pangalan`
    .split(/\s+/),
);
const ENGLISH = new Set(
  `i me my mine you your the a an is are am was were be been have has had do does did not and or but so because of in
   on at for with from this that these those it its what when why how where who can could should would will today
   yesterday tomorrow feel feeling felt very really just also about please thanks thank hello my been still again
   tired headache pain period next last after before when remember forget`
    .split(/\s+/),
);

// Her last 10 messages decide; with no clear words either way it stays english, the app's own language.
export function languageOf(texts: string[]): Language {
  let tagalog = 0;
  let english = 0;
  for (const text of texts.slice(-RECENT)) {
    for (const word of text.toLowerCase().match(/[\p{L}]+/gu) ?? []) {
      if (TAGALOG.has(word)) tagalog++;
      else if (ENGLISH.has(word)) english++;
    }
  }
  if (tagalog === 0) return 'english';
  if (english === 0) return 'tagalog';
  const share = tagalog / (tagalog + english);
  return share < 0.15 ? 'english' : share > 0.9 ? 'tagalog' : 'taglish';
}

// The language of this one message, so the reply follows a switch at once; a message with no clear
// words keeps the language she usually writes in.
export function messageLanguage(text: string, usual: Language): Language {
  const words = text.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  return words.some((w) => TAGALOG.has(w) || ENGLISH.has(w)) ? languageOf([text]) : usual;
}
