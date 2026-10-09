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
// Quoted from an approved WHO source; the English shows in Filipino slots until the team writes
// the Filipino (LUM-47), since a cited quote is safer than an empty slot.
const who = (en: string): Entry => ({ fil: null, en });

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
  'home.error': ui('Something went wrong. Try again, or use the checklist.'),
  'home.dev_native': ui('Native model test'),
  'home.setup': ui('Get Liora ready for offline'),
  'home.calendar': ui('Calendar'),
  'home.voice.error': ui('Voice did not work. Please type instead.'),
  'home.log': ui('My log'),
  'home.checklist.hint': ui('Opens the checklist'),

  'result.show_nurse': ui('Show this to the nurse'),
  'result.why': ui('Why?'),
  'result.skip': ui('Skip'),
  'result.yes': ui('Yes'),
  'result.no': ui('No'),
  'result.ask_checkup': ui('Ask at your check-up'),
  'result.home': ui('Done'),
  'result.back': ui('Back'),
  'result.not_found': ui('This entry is not on this phone.'),

  'go.headline': who('Go to the hospital or health centre immediately'),
  'go.line': who('Day or night, DO NOT wait.'),
  'go.signs.header': ui('Signs in your message'),
  'go.source.header': ui('Source'),

  'followup.skip_means': ui('If you skip, Liora treats it as serious.'),

  'calm.copy': who("If at any time you have any concerns about your or your baby’s health, go to the health centre."),
  'calm.watch.header': who('Go to the hospital or health centre immediately, day or night, DO NOT wait, if any of the following signs:'),
  'calm.watch.items': who('vaginal bleeding\nconvulsions/fits\nsevere headaches with blurred vision\nfever and too weak to get out of bed\nsevere abdominal pain\nfast or difficult breathing.'),

  'nurse.weeks': ui('Weeks pregnant'),
  'nurse.days_since_birth': ui('Days since giving birth'),
  'nurse.signs': ui('Signs she reported'),
  'nurse.logged': ui('Logged'),
  'nurse.bp': ui('Blood pressure she entered'),

  'sign.vaginal_bleeding': who('Bleeding vaginally'),
  'sign.convulsions': who('Convulsing'),
  'sign.fever': who('Fever'),
  'sign.severe_headache': who('Headache'),
  'sign.visual_disturbance': who('Visual disturbance'),
  'sign.imminent_delivery': who('Imminent delivery'),
  'sign.labour': who('Labour'),
  'sign.looks_very_ill': who('Looks very ill'),
  'sign.severe_vomiting': who('Vomiting'),
  'sign.severe_pain': who('Pain'),
  'sign.severe_abdominal_pain': who('Abdominal pain'),
  'sign.unconscious': who('Unconscious'),
  'sign.central_cyanosis': who('Central cyanosis'),
  'sign.severe_difficulty_breathing': who('Difficulty breathing'),

  'severity.severe': ui('severe'),
  'severity.moderate': ui('moderate'),
  'severity.mild': ui('mild'),
  'severity.unknown': ui('not sure yet'),

  // "Sobrang sakit ba?" is the team's own wording from the demo script (HANDOFF.md section 10).
  'fu.severe_headache': ui('Is it very painful?', 'Sobrang sakit ba?'),
  'fu.severe_pain': ui('Is it very painful?', 'Sobrang sakit ba?'),
  'fu.severe_abdominal_pain': ui('Is it very painful?', 'Sobrang sakit ba?'),
  'fu.severe_vomiting': ui('Is the vomiting very bad?'),
  'fu.severe_difficulty_breathing': ui('Is it very hard to breathe?'),

  'why.title': ui('Why?'),
  'why.none': ui('Ask at your check-up'),

  // calendar and log (LUM-65, LUM-62)
  'calendar.title': ui('Calendar'),
  'calendar.prev': ui('Previous month'),
  'calendar.next': ui('Next month'),
  'calendar.mark_start': ui('Mark period start'),
  'calendar.mark_end': ui('Mark period end'),
  'calendar.no_entries': ui('Nothing logged this day'),
  'calendar.next_period': ui('Next period around {date}'),
  'calendar.window': ui('It could start between {from} and {to}'),
  'calendar.basis.history': ui('Based on your logged periods'),
  'calendar.basis.stated': ui('Based on the cycle length you told Liora'),
  'calendar.confidence.low': ui('Confidence: low'),
  'calendar.confidence.medium': ui('Confidence: medium'),
  'calendar.confidence.high': ui('Confidence: high'),
  'calendar.not_birth_control': ui('Not for birth control.'),
  'calendar.need_period': ui('Mark a period start and Liora can estimate the next one'),
  'calendar.no_estimate_status': ui('No period estimate while pregnant or after giving birth.'),
  'calendar.confirm_start': ui('Started {date}, tama ba?'),
  'calendar.confirm_end': ui('Ended {date}, tama ba?'),
  'calendar.legend': ui('Solid: logged. Dashed: estimated.'),
  'calendar.day.logged': ui('period day, logged'),
  'calendar.day.estimated': ui('period day, estimated'),
  'calendar.day.today': ui('today'),
  'calendar.day.symptoms': ui('symptoms logged'),
  'calendar.day.mood': ui('mood logged'),
  'log.title': ui('My log'),
  'log.privacy': ui('Stays on this phone'),
  'log.empty': ui('Nothing logged yet'),
  'log.group.period': ui('Period'),
  'log.group.symptoms': ui('Symptoms'),
  'log.group.mood': ui('Mood'),
  'log.group.pregnancy': ui('Pregnancy'),
  'log.delete_entry': ui('Delete this entry'),
  'log.delete_all': ui('Delete everything'),
  'log.delete_all.confirm': ui('Delete everything on this phone? This cannot be undone.'),
  'log.cancel': ui('Cancel'),

  // setup and checklist (LUM-71, LUM-64)
  'setup.title': ui('Getting Liora ready for offline'),
  'setup.wifi': ui('Use Wi-Fi. The download is large.'),
  'setup.model.gemma': ui('Gemma 4'),
  'setup.model.voice': ui('Voice add-on'),
  'setup.model.cards': ui('Source card search'),
  'setup.done': ui('Ready'),
  'setup.web': ui('Not available on web'),
  'setup.failed': ui('Download did not finish. Try again on Wi-Fi.'),
  'setup.retry': ui('Try again'),
  'setup.mb': ui('MB'),
  'setup.download': ui('Download'),
  'setup.q.status': ui('Where are you now?'),
  'setup.status.pregnant': ui('Pregnant'),
  'setup.status.postpartum': ui('Recently gave birth'),
  'setup.status.neither': ui('Neither'),
  'setup.weeks': ui('Weeks pregnant'),
  'setup.days': ui('Days since birth'),
  'setup.last_period': ui('Last period started (YYYY-MM-DD)'),
  'setup.cycle_length': ui('Usual cycle length in days'),
  'setup.invalid': ui('Check the number or date'),
  'setup.save': ui('Save and continue'),
  'setup.skip': ui('Skip for now'),
  'checklist.title': ui('Check the signs'),
  'checklist.check': ui('Check'),
  'checklist.none': ui('Choose at least one'),
  // mood and crisis (LUM-63)
  // The two mood results and the crisis headline are team phrases, not quotes; the team confirms them (LUM-47).
  'home.mood': ui('Mood check'),
  'mood.of': ui('of'),
  'mood.back': ui('Back'),
  'mood.result.high': ui('Please talk about these answers with a health worker at your next check-up.'),
  'mood.result.low': ui('Thank you. Your answers stay on this phone.'),
  'mood.done': ui('Done'),
  'crisis.headline': ui('Talk to someone now.'),
  'crisis.call': ui('Call 1553'),
  'crisis.source': ui('WHO Philippines and DOH, 10 September 2020'),
  // how liora decided (LUM-76)
  'decided.link': ui('How Liora decided'),
  'decided.title': ui('How Liora decided'),
  'decided.reader.lexicon': ui('Word list'),
  'decided.reader.embedding': ui('Meaning match'),
  'decided.reader.llm': ui('AI typed decisions'),
  'decided.reader.checklist': ui('Checklist'),
  'decided.nothing': ui('Found nothing'),
  'decided.conf.high': ui('very likely'),
  'decided.conf.mid': ui('likely'),
  'decided.conf.low': ui('possible'),
  'decided.rules': ui('Rules that fired'),
  'decided.rules.none': ui('No rule fired'),
  'decided.models': ui('Models that ran'),
  'decided.models.none': ui('No AI model ran; the word list and rules decided.'),
  // name, lock and settings (LUM-81, LUM-82)
  'name.question': ui('What should Liora call you?'),
  'name.optional': ui('Optional. It stays on this phone.'),
  'home.greeting': ui('Hi, {name}'),
  'home.settings': ui('Settings'),
  'settings.title': ui('Settings'),
  'settings.name.save': ui('Save name'),
  'settings.lock': ui('Lock my private history with Face ID'),
  'lock.title': ui('Unlock with Face ID'),
  'lock.body': ui('Your log, mood checks and calendar are locked on this phone.'),
  'lock.button': ui('Unlock'),
  'lock.prompt': ui('Unlock your private history'),
  'lock.fallback': ui('Use passcode'),
  'tabs.today': ui('Today'),
  'tabs.calendar': ui('Calendar'),
  'tabs.liora': ui('Liora'),
  'tabs.profile': ui('Profile'),
  // companion (LUM-84): team phrases that only point to her data, the rules or a quoted card
  'companion.symptom.go_now': ui('This needs care now. Here is what the WHO rules say.'),
  'companion.symptom.follow_up': ui('One question first, so the rules can decide.'),
  'companion.symptom.ok': ui('Here is what the rules found.'),
  'companion.period.heard': ui('Shall I put this on your calendar?'),
  'companion.period.when': ui('When did it start? You can mark it on the calendar.'),
  'companion.mood.noted': ui('Thank you for telling me. I noted how you feel.'),
  'companion.cycle.pregnant': ui('While you are pregnant, Liora does not estimate periods.'),
  'companion.cycle.postpartum': ui('After birth, periods can take a while to return. Log one when it comes.'),
  'companion.cycle.no_data': ui('Log at least two periods and I can estimate the next one.'),
  'companion.health.card': ui('This is the closest reviewed source I have, word for word.'),
  'companion.health.ask': ui('I do not have a reviewed source for that. Ask at your check-up.'),
  'companion.greeting': ui('Hi, {name}. How are you feeling today?'),
  'companion.greeting.anon': ui('Hi. How are you feeling today?'),
  'companion.other': ui('Tell me how you feel, log your period, or ask about your cycle.'),
  'companion.action.checklist': ui('Danger-sign checklist'),
  'companion.action.mood_check': ui('Mood check'),
  'companion.action.calendar': ui('Calendar'),
  'companion.action.log_period': ui('Log period'),
  // companion thread (LUM-84)
  'liora.empty.title': ui('Kumusta? Tell Liora how you feel.'),
  'liora.empty.body': ui('Type or speak in Taglish. The rules decide; I only listen and point.'),
  'liora.starter.1': ui('Masakit ulo ko'),
  'liora.starter.2': ui('Nagsimula regla ko ngayon'),
  'liora.starter.3': ui('Kailan next period ko?'),
  'liora.placeholder': ui('Message Liora'),
  'liora.send': ui('Send'),
  'liora.typing': ui('Liora is thinking'),
  'liora.period.add': ui('Add to calendar'),
  'liora.period.skip': ui('Not now'),
  'liora.period.added': ui('Added to your calendar.'),
  'liora.go.open': ui('Open and show the nurse'),
  'liora.followup.open': ui('Answer the question'),
  'liora.error': ui('Something went wrong. Please try again.'),
  'liora.clear': ui('Clear conversation'),
  // companion thread (LUM-84)
  'liora.empty.title': ui('Kumusta? Tell Liora how you feel.'),
  'liora.empty.body': ui('Type or speak in Taglish. The rules decide; I only listen and point.'),
  'liora.starter.1': ui('Masakit ulo ko'),
  'liora.starter.2': ui('Nagsimula regla ko ngayon'),
  'liora.starter.3': ui('Kailan next period ko?'),
  'liora.placeholder': ui('Message Liora'),
  'liora.send': ui('Send'),
  'liora.typing': ui('Liora is thinking'),
  'liora.period.add': ui('Add to calendar'),
  'liora.period.skip': ui('Not now'),
  'liora.period.added': ui('Added to your calendar.'),
  'liora.go.open': ui('Open and show the nurse'),
  'liora.followup.open': ui('Answer the question'),
  'liora.error': ui('Something went wrong. Please try again.'),
  'liora.clear': ui('Clear conversation'),
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
