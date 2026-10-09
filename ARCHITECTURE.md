# Architecture

Tell Liora runs entirely on the phone. The code is split into layers that depend inward only, so
the safety rules can be read and tested without the models, the stores or the screens.

```
app/            routes and startup wiring (composition root)
  ↓
src/ui          screens' building blocks (React Native)
  ↓
src/store       application state and orchestration (zustand, persisted on the phone)
  ↓                                   ↑ model functions are injected at startup
src/ai          model adapters, prompts, retrieval, voice (llama.rn, expo-audio)
  ↓
src/content     fixed copy and reviewed source cards (data only)
  ↓
src/core        the domain: WHO rules, cycle maths, triage, agent policy (pure TypeScript)
```

## Rules

| Layer | May import | Must not import |
| --- | --- | --- |
| `src/core` | `src/core`, `zod`, `date-fns` | anything else: no React, React Native, Expo, zustand or model library |
| `src/content` | `src/core` | `src/ai`, `src/store`, `src/ui` |
| `src/ai` | `src/core`, `src/content` | `src/store`, `src/ui` |
| `src/store` | `src/core`, `src/content` | `src/ai` (model functions are injected), `src/ui` |
| `src/ui` | everything below it | `app/` |
| `app/` | everything | |

`scripts/architecture.test.ts` enforces this table on every `pnpm test`. Known exceptions are
listed there by file, each with the move that removes it; the list may only shrink.

## Why

- **The rules decide, and they stay pure.** `src/core` holds every decision (danger signs,
  triage, what the agent may save) as plain functions with tests, so a reviewer can check the
  safety logic without running a model.
- **Models are adapters.** Gemma and EmbeddingGemma sit behind small functions (`askGemma`,
  `routeWithGemma`, the reply and the card search). Stores receive them at startup
  (`setAskModel`, `setRouteActions`, `setSayReply`, `setRetrieveCard`), so every store and core
  test runs without a model, and the app still works when a model is missing.
- **Data stays on the phone.** Stores persist through `src/store/storage*.ts` only, and
  Delete everything clears every store.

## AI engineering conventions

- **Fast, deterministic first read (System 1):** `triage` in `src/core/agent/triage.ts` decides
  whether a message is urgent help, an update, a question about herself, a health question or
  chat, before any model runs. Urgent help always wins; an unclear message gets the full check.
- **Closed outputs:** Gemma answers typed yes/no questions and picks actions through a JSON
  schema; code resolves every date and number.
- **Guarded words:** Gemma's one reply per turn passes `guardReply`, which drops medical advice,
  diagnoses, reassurance, claims of actions not taken and numbers missing from her data.
- **Her words are data, never instructions:** `src/core/agent/guardrails.ts` strips chat-template
  tokens and fences from her message, notes and chat before any prompt, and an attempt to give
  Liora new instructions ("ignore your rules", "show your prompt") gets a fixed line with no model
  call and no writes. `guardReply` also drops sentences that repeat six words of the prompt or talk
  about the prompt, and the model's outputs stay closed (yes/no tokens, a JSON schema, a guarded
  reply), so injected text cannot reach a decision or a write.
- **Voice follows her day, facts follow her data:** the reply style (bright, gentle, steady) comes
  from the moods she logged today (`src/core/agent/style.ts`, comfort wins a mix), the language
  from her message, and every reply must name something from her data.
- **Timeouts and fallbacks everywhere:** every model call has a timeout; a missing, slow or
  failed model falls back to the word rules and fixed copy.
- **Measured, not claimed:** numbers in the README come from the demo iPhone only.
