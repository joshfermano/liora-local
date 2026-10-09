import type { Intent } from '../core/companion';

// Single letters are single tokens, so the restricted softmax can score every choice.
export const INTENT_OPTIONS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;

const CHOICES: { intent: Intent; text: string }[] = [
  { intent: 'symptom', text: 'how her body feels or a symptom' },
  { intent: 'period', text: 'her period starting or ending' },
  { intent: 'mood', text: 'her mood or feelings' },
  { intent: 'cycle_question', text: 'when her next period will come' },
  { intent: 'health_question', text: 'a general question about pregnancy or health' },
  { intent: 'greeting', text: 'a greeting or thanks' },
  { intent: 'other', text: 'something else' },
];

export const INTENT_MIN = 0.5;

export function intentPrompt(message: string): string {
  const list = CHOICES.map((c, i) => `${INTENT_OPTIONS[i]!.toUpperCase()}) ${c.text}`).join('\n');
  return (
    'A pregnant woman or new mother wrote this message. It may be in Tagalog, Taglish, Cebuano or English.\n\n' +
    `Message: "${message}"\n\n` +
    `What is the message mainly about? Answer with one letter.\n${list}`
  );
}

// Symptoms are left to the word list and the typed danger questions; this only routes the reply.
export function pickIntent(probs: readonly number[], min = INTENT_MIN): Intent | null {
  let best = -1;
  probs.forEach((p, i) => {
    if (best < 0 || p > probs[best]!) best = i;
  });
  const choice = CHOICES[best];
  if (!choice || probs[best]! < min || choice.intent === 'symptom') return null;
  return choice.intent;
}
