# HANDOFF: Tell Liora (liora-local)

**Last updated:** 2026-10-10, 1:35 AM Manila (Today, Calendar, Profile rebuilt; art and onboarding in flight).
**Deadline:** code freeze and submission **10:00 AM, 10 Oct 2026**, on
cerebralvalley.ai/e/appbuildersph-hackathon-2026. One submission, no edits after.
**Read next:** `docs/superpowers/specs/2026-10-09-tell-liora-design.md` (the build spec, v3),
`docs/research-summary.md` (verified facts) and section 10 below (what the team guide adds).

---

## 0. Quick start for the next session

```bash
cd ~/Personal/liora-local
claude
```

Then type `/handoff`. Or paste this prompt:

> Read HANDOFF.md, the spec in docs/superpowers/specs/, and docs/research-summary.md. Check
> `git log` and the Manila time. Tell me in plain language where we are and the single next step,
> then continue from HANDOFF.md section 2.

Update section 1 and section 2 of this file as work completes, so any session can pick up.

---

## 1. Where things stand

| Item                | State                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hackathon brief     | Read. Theme "Local AI": "Build an AI product that remains genuinely useful when the cloud disappears."                                                                                                                                                                                                                                                                                                         |
| Deep research       | Done: 5 angles, 23 sources, 25 claims verified 3 ways. See `docs/research-summary.md`.                                                                                                                                                                                                                                                                                                                         |
| Concept             | **Approved:** "Tell Liora", for the mother herself. Pregnancy danger signs are the demo star; period, symptom and mood logging use the same input.                                                                                                                                                                                                                                                       |
| Platform            | **Approved:** one web app (Expo exported for web) in Safari on the iPhones and in laptop browsers. No native app.                                                                                                                                                                                                                                                                                              |
| Platform            | **Native iPhone app (decided 2026-10-09, 9:55 PM).** Expo prebuild; Gemma 4 E2B Q4_0 GGUF (2.7 GB, memory-mapped) through llama.rn 0.13.0-rc.7; test screen `app/dev/native.tsx`. iPhone 16 Pro Max (proof phone, not a demo phone): download 280 s at about 10 MB/s, load 14.7 s on the GPU, 2.0 to 2.5 s for all 17 questions, no crash. Free Apple ID signing works (Increased Memory Limit yes, Extended Virtual Addressing no); iOS 27 needs the scene life cycle (config plugin, 3e68ca5). The web export still builds as the fallback. |
| Scope               | **Approved:** text and voice input, danger-sign decision model, go-now screen, nurse card, calm answer, on-device RAG over cited source cards, log, mood check, AI-off checklist, "How Liora decided" drawer, privacy controls, **cycle calendar with next-period estimate**. Stretch: photo of check-up record. Out: photos of the body, medicine advice, fertile-window predictions, contraception guidance. |
| Spec                | **Approved, v4** (models changed by the user on 2026-10-09 evening: Gemma 4 E2B, Jev-style typed decisions, EmbeddingGemma 2): `docs/superpowers/specs/2026-10-09-tell-liora-design.md`.                                                                                                                                                                                                                                                                                                                                    |
| Implementation plan | Linear project `liora-local-hackathon`: milestones M1–M7, tickets LUM-44 to LUM-78, each with acceptance criteria and blockers. Ticket rules in `AGENTS.md`; `/tickets` shows progress. |
| Code                | **Built by midnight, 10 Oct (main, 377 tests):** decision engine and pipeline (with the SR-1 rule that the model alone can't skip a follow-up); Gemma 4 typed decisions and voice; EmbeddingGemma 300M card search on calm answers; 17 reviewed cards; WHO-quoted copy; screens: home, go-now, nurse card, follow-up, calm, "Why?", "How Liora decided", setup (3 downloads), AI-off checklist, calendar (with period-from-text chip), My log, PHQ-9 mood check and crisis; eval runner on the test screen. Safety review done (LUM-73). **Checked on a phone:** only the early go-now flow; every later build waits for the iPhone to reconnect. |
| GitHub repo / Pages | Public repo `joshfermano/liora-local`; Pages live at https://joshfermano.github.io/liora-local/ (deploys from `main` through Actions). Quick phone testing through `pnpm expo start --tunnel`. |
| S1 findings         | iPhone Safari 27.0.1: WebGPU on, shader-f16 on, largest GPU buffer 1,024 MB, not cross-origin isolated, about 39 GB storage. Gemma 4 E2B's 1,120 MB token-embedding table is too big for the GPU, so it was moved to the CPU (f928688). **Then the tab was killed at 1,763 of 2,985 MB downloaded (179 s, about 10 MB/s):** Transformers.js holds each whole file in memory until it finishes, and Gemma 4 E2B q4f16 needs about 3 GB at once, plus 1.5 GB of CPU memory for the token embeddings. As packaged, Gemma 4 E2B does not fit a browser tab. Nothing was cached. |
| Typed decisions     | Code in a866603 (`src/ai/typed-decisions.ts`, `workers/decide.ts`). Laptop observation only (4-bit decoder on CPU, about 0.7 s per question): phrase 1 go-now, phrase 2 calm, phrase 3 go-now instead of the headache follow-up. Causes: the "very ill" question says yes to any ache; the severity score says "moderate" when the message does not say. A yes/no rewording fixed phrase 3 and the "very ill" question but read "medyo masakit" as neither mild nor severe; not applied yet. |
| Timeline            | 1 AM: the user asked for a full, premium, Apple-native app: native Liquid Glass tabs (Today, Calendar, Liora, Profile), a Liora companion thread that reads her logs and shows the rules' decision with the nurse card inline, and a profile with age, height and weight. Skeleton on main (4706107 to 2725062); three agents build the tabs in parallel worktrees. |

## 2. Next steps, in order

1. **Done by 1:35 AM** (all on main, 462 tests): tabs; Liora companion; Today, Calendar (month,
   year, edit mode, day sheet) and Profile rebuilt in the reference design language with fresh code;
   day-log sheet; native wheel pickers; the rules now follow her saved status after a restart.
   In flight: the art kit (capiz window, season, avatar and log marks) and a four-step onboarding
   in place of the setup form. The iPhone 17 Pro runs a live-reload build (`.tmp/EXTRAS.md`).
2. **Check every screen on the iPhone 17 Pro** while it live-reloads, then swap the drawn marks into
   Today (season mark) and the day log (log marks) once the art kit lands. Older screens still in
   the first design: result screens, nurse card, checklist, mood check, My log.
3. **iPhone 17:** plug into the Mac once, Developer Mode on, build, trust the developer, download
   the models in setup.
4. **Measurements (LUM-77):** load and answer times and the eval phrases on both demo phones; fill
   the README table with demo-phone numbers only.
5. **Team content (Ivan):** Filipino copy (LUM-47), eval phrases (LUM-77), confirmations (LUM-54).
6. **Submission:** README (LUM-78), 1-minute video and post (LUM-48), final demo build without
   `EXPO_PUBLIC_SHOW_DEV`, submit on Cerebral Valley before 10:00 AM (LUM-49).

## 3. The product in one paragraph

A pregnant or new mother, alone at home at 2 AM with no signal, types or says how she feels in
Taglish. On-device models translate her words into symptom codes (word list, embeddings,
and Gemma 4 answering Jev-style typed questions; any one finding a danger sign counts). A deterministic decision model built from WHO and
DOH tables decides: "go to the hospital now" with a card for the nurse, one fixed follow-up
question, or a calm answer with the cited WHO/DOH passage shown word for word. The same input logs
periods and moods onto a cycle calendar with an explained next-period estimate. A private EPDS mood
check shows a crisis hotline on any self-harm answer. Nothing leaves the phone.
**Value proposition:** "Know when to go, even with no signal and no one watching."

## 4. Algorithms (no neural network decides anything)

| Part                 | Algorithm                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Danger signs         | Deterministic decision table from WHO ANC.DT.01 / DT.17 and DOH warning signs                                                                  |
| Follow-ups           | Fixed question table; skipping counts as serious                                                                                               |
| Mood check           | PHQ-9 sum score 0 to 27, cut-off 10, item-9 short-circuit (switched from the EPDS for licensing, 2026-10-09)                                   |
| Next-period estimate | Recency-weighted median of the last up to 12 cycle lengths (decay 0.85), forgotten periods left out; window and confidence fitted by replaying her own history (from 6 replays: 10th to 90th percentile of the misses, at least ±1 day; before that ±max(2, ceil(spread/2))); `track` counts how often the window held (spec section 8) |
| Source cards         | Cosine-similarity nearest-neighbour search over multimodal embeddings (EmbeddingGemma 2), with a threshold                                                                   |
| Understanding text   | Jev-style typed decisions on Gemma 4 E2B: a softmax restricted to each question's options gives the answer and its confidence (SemIf method; Laya fallback)                                                                                |
| Voice                | Gemma 4 E2B speech recognition (Whisper base fallback)                                                                                                                     |

## 5. Decisions and why (do not re-open without the user)

| Decision                                                                                             | Why                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh repo, all code written during the hackathon | The hackathon disqualifies pre-existing projects and judges review the public repo. |
| User is the **mother herself**, not a health worker                                                  | User: in the Philippines, pregnant women go to centres themselves; nobody visits them. The deciding moment is hers, at home.                                              |
| **PHQ-9** for the mood check, not the EPDS (user's call, 2026-10-09 about 10:55 PM) | The EPDS is copyrighted by the Royal College of Psychiatrists and may need permission to ship in an app; the PHQ-9 form says "No permission required to reproduce, translate, display or distribute". Items quoted from the official form; cut-off 10; item 9 opens the crisis screen. Hotline quoted from the WHO Philippines and DOH release of 10 Sept 2020 (NCMH 1553). |
| ~~**Web app**, not native iOS~~, superseded on 2026-10-09 at 9:55 PM by a **native iPhone app** (Expo prebuild, llama.rn) | The user wanted Gemma 4 to run as it does in native apps. Safari killed the tab at 1.76 GB while downloading Gemma 4 (it needs about 3 GB held at once). The native proof passed on an iPhone 16 Pro Max: load 14.7 s on the GPU, 2.0 to 2.5 s for 17 typed questions, no crash (LUM-79). Builds run on a teammate's Mac; see `.tmp/EXTRAS.md`. The web export still builds and stays the fallback. |
| **Expo web**, not plain Vite                                                                         | The team's chosen stack. Metro risk is mitigated by bundling the workers with esbuild outside Metro. Fallback: Vite + React shell with the same `src/core/`.     |
| ~~WebLLM for the text model~~, superseded on 2026-10-09 evening by **Gemma 4 E2B on Transformers.js** | The user prefers Gemma 4. WebLLM 0.2.85 has no Gemma 4 build; Transformers.js 4.3.1 runs `onnx-community/gemma-4-E2B-it-ONNX`. WebLLM stays only for the Gemma 3 1B fallback. |
| **Transformers.js** for every model | Runs Gemma 4 E2B, EmbeddingGemma 2 and the fallbacks in the browser on WebGPU or WASM. |
| AI translates, **rules decide**                                                                      | Rules are predictable, testable and cited.               |
| Any translator's danger finding counts                                                               | The AI can only add caution, never hide a sign the word list caught.                                                                                                      |
| RAG shows cited passages **verbatim**                                                                | A small model paraphrasing medical text can change its meaning.                                                                                                           |
| Voice in; photo of the body never                                                                    | Voice helps tired or low-literacy users; photo diagnosis would break "never diagnose".                                                                                    |
| **Cycle calendar** kept, fertile window out                                                          | User asked to retain cycle tracking; it reuses the same input. Fertile-window predictions read as contraception guidance, which this app never gives.                        |
| ~~Estimate = simple moving average, mean not median~~, superseded on 2026-10-10 by a **recency-weighted median** with forgotten periods left out (user's call) | On seeded simulated histories both were within a tenth of a day on tidy logs, but with 15% of periods unlogged the mean was off by about 4.6 days against 1.5, and one odd cycle pulled the mean further. Simulated numbers choose the method only; they are never quoted as results. |
| Use six third-party UI and React Native skills (impeccable, ui-ux-pro-max, frontend-design, vercel-react-native-skills, imagegen-frontend-mobile, motion-graphics); keep them out of git | User asked for them. Third-party skills are gitignored, with sources in `skills-lock.json`, so the public repo does not redistribute them. |
| Add 2 skills from skills.sh: `transformers-js` (Hugging Face) and `web-design-guidelines` (Vercel). Skip the rest the search found | User asked for skills on mobile design, performance and local AI, then to install them. These two were the only trusted ones that fit. No trustworthy WebLLM skill exists (2 installs); read WebLLM docs through context7. Skipped: `pwa-development` (barely covers iPhone Safari), `web-perf` (page-load scores, needs a Chrome DevTools tool), `animate-expo` and Callstack RN (native-only), healthcare CDSS (drug doses; could tempt made-up medical content), regex-vs-llm (re-opens the translator design), `llm-evaluation` (generic). |
| Write `PRODUCT.md` and `DESIGN.md` with the **Capiz Light** design system and a **warm voice, plainer when urgent** | User picked both on 2026-10-09. Glass bars, widgets, notifications, sign-up, choreographed transitions and per-screen artwork are left out: the web or the deadline cannot carry them. Proposed in `DESIGN.md`, open to veto: no green for a calm answer (green is kept for a fertile window, which this app never shows); the alarm red stays deep in dark mode (white on the brighter red fails at 2.79:1); the crisis screen does not shout; urgent screens use the system face and no entrance animation. |
| **Jev-style local typed decisions**; rules stay final | User, 2026-10-09: Jev is TypeSafe AI's decision model, cloud-only, so its idea runs locally: typed questions scored from Gemma 4's option probabilities (SemIf method), with Laya-multilingual as fallback. The user confirmed the learned model never makes the final call; it only adds findings with a confidence. |
| **EmbeddingGemma 2** for multimodal retrieval | User asked for local multimodal embeddings and prefers Gemma. Apache-2.0, text and images in one space, 100+ languages, ~157 MB text model. `jina-clip-v2` rejected: CC BY-NC 4.0 and ~861 MB. |
| **`AGENTS.md` shared by every coding agent; Conventional Commits; no AI co-authors** | User, 2026-10-09. Claude Code reads only `CLAUDE.md` when both exist, so `CLAUDE.md` imports `@AGENTS.md` and adds Claude-only notes. Enforced by `.githooks/commit-msg` and `scripts/ci-status.sh`; Claude Code's attribution is off in `.claude/settings.json`. Older commits keep the `add ...` style. |

## 6. Environment

- **Laptop:** Fedora Linux 44, Node 24.18, pnpm 9.15, Google Chrome, `gh` logged in as
  `joshfermano`, `uv` available. No Mac.
- **Demo devices:** iPhone 17 and iPhone 17 Pro, both iOS 27.2.

## 7. Verified versions (checked 2026-10-09)

- `@mlc-ai/web-llm` 0.2.85. Prebuilt models with WebLLM's GPU estimates:
  `gemma3-1b-it-q4f16_1-MLC` ~711 MB, `Llama-3.2-1B-Instruct-q4f16_1-MLC` ~879 MB,
  `Qwen3-0.6B-q4f16_1-MLC` ~1,403 MB, `Qwen3-1.7B-q4f16_1-MLC` ~2,037 MB. q4f16 needs WebGPU
  `shader-f16`; q4f32 variants exist for Llama 3.2 1B and Qwen3 0.6B. JSON-schema output:
  `response_format: { type: 'json_object', schema: '<JSON Schema string>' }`.
- `@huggingface/transformers` 4.3.1: `pipeline(task, model, { device: 'webgpu' })`. Whisper takes
  `language` and `task`; feature extraction takes `{ pooling: 'mean', normalize: true }`.
- Hugging Face models with Transformers.js builds: `onnx-community/whisper-base` (decoder ~54 MB
  int8), `onnx-community/whisper-tiny`, `onnx-community/whisper-small`,
  `Xenova/multilingual-e5-small` (~118 MB int8), `onnx-community/embeddinggemma-300m-ONNX`
  (~197 MB q4, Gemma licence), `onnx-community/Florence-2-base-ft` (MIT).
- Vite fallback only: `vite` 8.3.4, `vite-plugin-pwa` 2.0.0, `react` 19.3.0. The Expo build pins
  React 19.2.3.

**Added 2026-10-09 evening (spec v4; details and sources in `docs/research-summary.md` items 8 to 11):**

- `@huggingface/transformers` 4.3.1 (2026-10-07) has `gemma4`, `embedding_gemma2`, `modernbert`.
- `onnx-community/gemma-4-E2B-it-ONNX`: decoder q4f16 ~1,520 MB, token embeddings q4f16 ~1,591 MB
  (int8: ~3.2 GB, see the correction below), audio encoder q4f16 ~172 MB, vision encoder q4f16 ~99 MB. 2-bit fallback:
  `onnx-community/gemma-4-E2B-it-qat-mobile-ONNX`.
- **Correction from the Hub file listing (2026-10-09, LUM-58):** `embed_tokens_quantized` (the int8
  option) is three shards of 465.6 + 2,348.8 + 367.0 MB, about 3.2 GB in all. The "466 MB" was
  only the first shard. `embed_tokens_q4f16` is one 1,590.7 MB file. Text-only Gemma 4 is therefore
  about 3.1 GB with q4f16 embeddings and about 4.7 GB with quantized ones. The qat-mobile build is
  decoder q2f16 994.6 MB + embed_tokens q2f16 1,296.6 MB (about 2.3 GB). Not yet tried on a device.
- Transformers.js 4.3.1 text-only Gemma 4: `Gemma4ForCausalLM.from_pretrained(repo, { device:
  'webgpu', dtype: { embed_tokens, decoder_model_merged } })` loads just those two sessions (no
  audio or vision encoder). dtype `q8` means the `_quantized` file. EmbeddingGemma 2 text only:
  `AutoConfig` with `vision_config` and `audio_config` set to null, then `AutoModel.from_pretrained`
  with `dtype: 'q4f16'`; the output is `sentence_embedding`.
- `onnx-community/embeddinggemma-2-ONNX`: text q4f16 ~157 MB, vision q4f16 ~98 MB.
- Laya: `convaiinnovations/laya-multilingual` (322M, ~644 MB safetensors); browser runner in the
  repo's `laya-ts/` (not on npm).

## 8. Submission requirements (official briefing)

- Project name, short description, team members (must be on the appbuildersph.com/hackathon list).
- **Public GitHub repo** by 10:00 AM; judges review it as of the deadline. Include instructions to
  recreate the app.
- **Demo video** (~1 minute) and an **X or LinkedIn post** with it, tagging Devin / Cognition and
  #AppBuildersPH.
- Disclose models, technologies, APIs and cloud services, existing code and assets, AI development
  tools (Claude Code, plus the agent skills in `skills-lock.json`); state what runs locally and what needs internet.
- Answer **"Why does this product benefit from running AI locally?"** Draft: it works with no
  signal or load, her words never leave the phone, it answers in seconds, and with no per-question
  cost Liora can keep it free.
- Demo Day: Sat 10 Oct, Cyberzone SM Makati. Finalists announced 1:00 PM; pitching from 1:40 PM.
  5-minute pitch and live demo plus 3 minutes of Q&A. Bring a laptop; HDMI and USB-C available.
- Judging: Problem & Usefulness 25%, Local AI Implementation 25%, Technical Execution 20%,
  Innovation 15%, Product & Demo 15%.
- Disqualifiers: pre-existing project, help from outside the hackathon, fake benchmarks.

## 9. Files

| File                                                                | Purpose                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------- |
| `HANDOFF.md`                                                        | This file: status, next steps, decisions                  |
| `PRODUCT.md`, `DESIGN.md` | Product context and the design system; impeccable reads both. Components are committed, not built: re-run `$impeccable document` once screens exist |
| `.claude/agents/` (ours) | Six subagents: ui-ux-designer, frontend-engineer, ai-engineer, backend-architect, devops-engineer (Haiku), safety-reviewer. Roster and usage rules in CLAUDE.md |
| `scripts/ci-status.sh`, `.claude/commands/ci-watch.md` | Free commit and CI check; `/loop 15m /ci-watch` wakes the devops agent only on a flag |
| `.githooks/commit-msg`, `.claude/settings.json` | Commit-message check (enable with `git config core.hooksPath .githooks`); Claude Code attribution off |
| `AGENTS.md`, `CLAUDE.md` | Shared agent rules, including the commit convention; `CLAUDE.md` imports them and adds Claude-only notes |
| `.claude/commands/handoff.md`                                       | The `/handoff` command                                    |
| `.claude/skills/` | Eight third-party skills: six UI and React Native skills, plus `transformers-js` and `web-design-guidelines` (local only, gitignored) |
| `skills-lock.json` | Where each skill came from, for reinstalling |
| `docs/superpowers/specs/2026-10-09-tell-liora-design.md`            | Build spec v3, the source of truth                        |
| `docs/research-summary.md`                                          | Verified facts, refuted claims, open questions            |
| `~/Downloads/Liora-Hackathon-Research-Report.pdf`                   | Research report                                           |
| `~/Downloads/Tell-Liora-Build-Spec.md`                              | Byte-identical copy of the spec (checked 2026-10-09); not added to the repo, the repo spec is the one to edit |
| `~/Downloads/Tell-Liora-App-Documentation.pdf`                      | **Outdated** (spec v1). Ignore.                           |
| `~/Downloads/AppBuildersPH-Hackathon-2026-Participant-Briefing.pdf` | Official briefing                                         |

## 10. Demo script, judge Q&A and the 10 AM checklist

From the team's plain-language guide (kept outside the repo). If it and the spec disagree, the spec
wins:

- **Demo script (guide section 9), 5 minutes:**
  1. Show both iPhones in airplane mode.
  2. Speak "32 weeks na ako, sobrang sakit ng ulo tapos malabo paningin". The words appear as text.
  3. Go-now screen with the WHO source, then tap "Show this to the nurse".
  4. Open "How Liora decided": what each translator found and the WHO rule that made the call.
     The guide says all three translators find the signs; only say that if the drawer shows it.
  5. Type "medyo masakit ang balakang ko": calm answer plus a source card, word for word.
  6. Type "masakit ulo ko": Liora asks "Sobrang sakit ba?"
  7. The private mood check and the hotline screen.
  8. The numbers measured on these iPhones.

  Use these three phrases as the first S1 test cases and eval cases.
- **Native-app notes for the demo (10 Oct, midnight):**
  - Open Tell Liora and wait for **"AI on"** (about 15 s cold) before airplane mode matters; the
    models were downloaded at setup.
  - Step 2: tap the mic, speak, tap again; the words land in the box to edit, then Check.
  - Step 4: "How Liora decided" is the link under every result.
  - Step 5: the calm card comes from card search (EmbeddingGemma); with no close match it says "Ask
    at your check-up".
  - Step 7: the mood check is the **PHQ-9** (not the EPDS); answering question 9 above "Not at all"
    opens the crisis screen with NCMH 1553.
  - Before the final demo build, hide the "Native model test" link (LUM-73).
- **Judge Q&A (guide section 10):** "If rules decide, why use AI?", "What if the AI is wrong?",
  "Is this a medical device?", "Why not a native app?", with drafted answers. Updates: it **is** a
  native app now (Safari could not hold Gemma 4 in one tab; native reads the model from storage).
  "What if the AI is wrong?": the WHO rules decide; an unsure sign gets a follow-up question; the AI
  can add caution but can never skip a follow-up on its own; with no AI, the checklist still decides.
- **10 AM checklist (guide section 7):** four boxes: it works, it's safe and private, it's proven,
  it's submitted. Use it as the final definition of done.
- **Feature numbers:** the guide numbers the 15 must-haves 1 to 15. Guide 1 to 13 are FR-1 to
  FR-13; guide 14 is FR-17 (calendar); guide 15 is FR-18 (next-period estimate).
- **Problem line for the pitch:** "Today she guesses, searches online, asks a Facebook group, or
  waits until morning." The intended impact is labelled as goals, not results; keep it that way.

Points to settle during the build (not blocking now):

- **What the calendar draws dashed.** The spec says the prediction window is drawn dashed, and
  also gives a period length "for drawing predicted days". The guide's sketch dashes 5 days
  (Oct 23 to 27) under "around Oct 24, medium confidence", but by spec section 8 a medium result
  has a window of at least ±4 days. Decide when building FR-17. The sketch's dates are labelled
  illustrative ("Started Oct 8" does not fit a next period on Oct 24); do not reuse them as demo
  data.
- **Pitch claims to measure before saying:** "Instant" and "answers in seconds" (NFR-4 says
  measure, don't claim; the AI timeout alone is 8 s). "One web app reaches every phone with a
  modern browser": the text AI needs WebGPU, so say what we tested, and that without WebGPU the
  checklist still works.
- **Sketch copy is placeholder** ("This is common in pregnancy", "Severe headache and blurry vision
  are warning signs in pregnancy"). Never copy it into the app; real wording comes from cited
  source cards and the fixed-copy tables.
- **Superseded by spec v4:** the team guide's sections 3 and 5 ("How it works", "The AI on her
  phone") name WebLLM, Whisper and multilingual-e5-small as the models. The spec wins.
