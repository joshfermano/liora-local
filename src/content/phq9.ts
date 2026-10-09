// Word for word from the official PHQ-9 form (phqscreeners.com, PHQ-9_English.pdf).
export const PHQ9_SOURCE = 'https://www.phqscreeners.com/images/sites/g/files/g10060481/f/201412/PHQ-9_English.pdf';

export const PHQ9_CREDIT =
  'Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc. No permission required to reproduce, translate, display or distribute.';

export const PHQ9_PROMPT = 'Over the last 2 weeks, how often have you been bothered by any of the following problems?';

export const PHQ9_ITEMS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead or of hurting yourself in some way',
] as const;

export const PHQ9_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
] as const;

// WHO Philippines and DOH joint release, 10 September 2020, quoted word for word.
export const CRISIS_HOTLINE = {
  text: '24/7 NCMH Crisis Hotline 1553, 0917 899 8727(USAP), and/or 7-989-8727 (USAP)',
  call: '1553',
  source:
    'https://www.who.int/philippines/news/detail/10-09-2020-doh-and-who-promote-holistic-mental-health-wellness-in-light-of-world-suicide-prevention-day',
};
