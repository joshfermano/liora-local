// Every user-facing string lives here, keyed by id. `null` means "a human has not written this
// yet": the screen shows `[copy: <key>]`. Medical copy (LUM-47) is never written by code.
export type Lang = 'fil' | 'en';
interface Entry {
  fil: string | null;
  en: string | null;
  // A medical string never falls back to the other language.
  medical?: boolean;
}

const ui = (en: string, fil: string | null = null): Entry => ({ fil, en });
const med = (): Entry => ({ fil: null, en: null, medical: true });

export const COPY = {
  'home.prompt': ui('How are you feeling?', "Ano'ng nararamdaman mo?"),
  'home.field.label': ui('Tell Liora how you feel'),
  'home.check': ui('Check'),
  'home.mic': ui('Record your voice'),
  'home.mic.stop': ui('Stop recording'),
  'home.recording.of': ui('of'),
  'home.privacy': ui('Stays on this phone'),
  'home.ai.on': ui('AI on'),
  'home.ai.off': ui('AI off, checklist on'),
  'home.offline': ui('Offline'),
  'home.error': med(),
  'home.dev_native': ui('Native model test'),

  'result.show_nurse': ui('Show this to the nurse'),
  'result.why': ui('Why?'),
  'result.skip': ui('Skip'),
  'result.yes': ui('Yes'),
  'result.no': ui('No'),
  'result.ask_checkup': ui('Ask at your check-up'),
  'result.home': ui('Done'),
  'result.back': ui('Back'),
  'result.not_found': med(),

  'go.headline': med(),
  'go.line': med(),
  'go.signs.header': med(),
  'go.source.header': med(),

  'followup.skip_means': med(),

  'calm.copy': med(),
  'calm.watch.header': med(),
  'calm.watch.items': med(),

  'nurse.weeks': med(),
  'nurse.days_since_birth': med(),
  'nurse.signs': med(),
  'nurse.logged': med(),
  'nurse.bp': med(),

  'why.title': ui('Why?'),
  'why.none': ui('Ask at your check-up'),
} as const satisfies Record<string, Entry>;

export type CopyKey = keyof typeof COPY;

const SEVERITY_KEYS = ['mild', 'moderate', 'severe', 'unknown'] as const;

// Keys built from data (`fu.<code>`, `sign.<code>`, `severity.<level>`) are medical, not yet written.
export function copyText(key: string, lang: Lang): string {
  const entry = (COPY as Record<string, Entry>)[key];
  if (!entry) return `[copy: ${key}]`;
  const own = entry[lang];
  if (own !== null) return own;
  if (entry.medical) return `[copy: ${key}]`;
  return entry[lang === 'fil' ? 'en' : 'fil'] ?? `[copy: ${key}]`;
}

export const fil = (key: string): string => copyText(key, 'fil');
export const en = (key: string): string => copyText(key, 'en');

export const signKey = (code: string): string => `sign.${code}`;
export const severityKey = (level: string): string =>
  (SEVERITY_KEYS as readonly string[]).includes(level) ? `severity.${level}` : `severity.unknown`;
export const followUpKey = (questionId: string): string => questionId;
