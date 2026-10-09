import { hashText } from '../core/cache/hash';
import { PROMPTS } from './prompts';
import { QUESTIONS } from './typed-decisions';

// The frame has a version; the question wordings live in typed-decisions.ts, so they are hashed in
// and an edit there changes the key (and so empties the typed-answer cache) even if nobody bumped
// the frame's version.
export const TYPED_PROMPT_KEY = `${PROMPTS.typed.version}.${hashText(QUESTIONS.map((q) => `${q.id}:${q.text}`).join('\n'))}`;

// What an entry records as the prompts its model was given.
export const GEMMA_PROMPTS = { typed: TYPED_PROMPT_KEY };
