// Input patterns only: words about not wanting to live or about self-harm, in Tagalog, Taglish or
// English. Any of them sends her to the crisis screen's fixed copy and NCMH 1553, before anything else.
// "Mamatay sa sakit" (dying of pain) is a figure of speech about pain and is left to the danger check.
const SELF_HARM =
  /\b(?:gusto|gusto\s+ko|gusto\s+kong|sana|mas\s+mabuti\s+pang?)\s+(?:na(?:ng)?\s+)?mamatay\b(?!\s+sa\s+(?:sakit|kirot))|\bmamatay\s+na\s+lang\b|\bmagpakamatay\b|\b(?:papatayin|patayin)\s+(?:ko\s+)?(?:na\s+)?(?:ang\s+)?sarili\b|\b(?:sasaktan|saktan)\s+(?:ko\s+)?(?:ang\s+)?sarili\b|\b(?:ayoko|ayaw\s+ko|ayaw\s+kong)\s+(?:na(?:ng)?\s+)?mabuhay\b|\bwala\s+(?:na(?:ng)?\s+)?(?:saysay|silbi|dahilan)\s+(?:ang\s+)?(?:buhay|mabuhay)\b|\bkill\s+myself\b|\bend(?:ing)?\s+(?:my\s+life|it\s+all)\b|\bsuicid\w*|\b(?:want|wanna|wish\s+I\s+could)\s+(?:to\s+)?die\b|\bdon'?t\s+want\s+to\s+(?:live|be\s+alive)\b|\bhurt\s+myself\b|\bself[-\s]?harm\b|\bbetter\s+off\s+dead\b/i;

export function mentionsSelfHarm(text: string): boolean {
  return SELF_HARM.test(text);
}
