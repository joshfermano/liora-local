// Input patterns only: signs on the DOH Mother and Child Book's warning-signs list (p. 4) that the WHO
// danger-sign rules do not cover. A match shows that cited card verbatim; it never decides anything.
const SIGNS =
  /\b(?:hindi|di)\s+(?:na\s+)?(?:gumagalaw|sumisipa|kumikilos)\s+(?:si\s+|ang\s+)?(?:baby|bata|sanggol)|\b(?:baby|bata|sanggol)\s+(?:ko\s+)?(?:ay\s+)?(?:hindi|di)\s+(?:na\s+)?(?:gumagalaw|sumisipa)|\bbihira(?:ng)?\s+(?:na\s+)?(?:gumalaw|sumipa)|\b(?:baby|bata)\s+(?:is\s+)?not\s+(?:moving|kicking)|\b(?:baby|bata)\s+(?:has\s*n'?t|hasnt|has\s+not|did\s*n'?t|didnt|did\s+not)\s+(?:moved?|kicked?)\b|\b(?:less|fewer|reduced|no)\s+(?:fetal\s+)?(?:movements?|kicks)\b|\bhindi\s+ko\s+(?:na\s+)?(?:maramdaman|ramdam)\s+(?:si\s+|ang\s+)?(?:baby|bata)|\b(?:manas|namamanas|minamanas)\b|\bnamamaga\s+(?:ang\s+)?(?:paa|kamay|mukha|binti|legs?)|\bswollen\s+(?:feet|legs|hands|face|ankles)|\bswelling\b|\b(?:nahihilo|hilo|nahihimatay)\b|\b(?:dizzy|dizziness|lightheaded|faint(?:ing)?)\b|\bmaputla\b|\b(?:look|looks|feel|am)\s+pale\b|\bmasakit\s+(?:(?:pag|kapag|kung)\s+)?(?:umihi|umiihi|mag-?ihi|ang\s+pag-?ihi)|\b(?:may\s+)?(?:lumalabas|tumutulo(?:ng)?)\s+(?:na\s+)?tubig\b|\bleaking\s+(?:fluid|water)\b|\bhapdi\s+(?:umihi|ng\s+ihi|pag-?ihi)|\bburns?\s+when\s+I\s+pee|\bpainful\s+urination|\b(?:ginaw|giniginaw)\b|\bchills\b|\b(?:watery|matubig\s+na)\s+discharge\b/i;

export const WARNING_SIGNS_CARD = 'mcb-p4-warning-signs';

export function warningSignsCard(text: string): string | null {
  return SIGNS.test(text) ? WARNING_SIGNS_CARD : null;
}

// After birth: the WHO "go to the health centre as soon as possible" list (PCPNC M4, p. 165).
const AFTER_BIRTH =
  /\b(?:tahi|stitch(?:es)?|sugat|wound|incision|hiwa)\b.*\b(?:sakit|masakit|kirot|maga|namamaga|nana|pula|namumula|bumuka|infect\w*|pain\w*|hurts?|sore|swollen|red|pus|open(?:ed)?|mabaho|smell\w*)\b|\b(?:sakit|masakit|kirot|maga|namamaga|nana|pula|namumula|bumuka|infect\w*|pain\w*|hurts?|sore|swollen|red|pus)\b.*\b(?:tahi|stitch(?:es)?|sugat|wound|incision|hiwa)\b|\bperine\w*\b|\bhirap\s+(?:akong\s+|ako\s+)?(?:umihi|mag-?ihi)|\b(?:masakit|mahapdi)\s+(?:(?:pag|kapag|kung)\s+)?(?:umihi|umiihi)|\btumutulo\s+(?:ang\s+)?ihi|\b(?:can'?t|cannot|hard\s+to)\s+pee\b|\bleaking\s+urine\b|\b(?:mabaho(?:ng)?|smelly|foul)\b.*\bdischarge\b|\bdischarge\b.*\b(?:mabaho|smelly|foul)\b|\b(?:dede|suso|utong|breasts?|nipples?)\b.*\b(?:namamaga|maga|pula|namumula|swollen|red)\b|\b(?:namamaga|maga|pula|namumula|swollen|red)\b.*\b(?:dede|suso|utong|breasts?|nipples?)\b/i;

export const AFTER_BIRTH_CARD = 'pcpnc-m4-danger-soon';

export function afterBirthCard(text: string): string | null {
  return AFTER_BIRTH.test(text) ? AFTER_BIRTH_CARD : null;
}
