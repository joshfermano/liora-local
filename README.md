# Tell Liora

**Know when to go, even with no signal and no one watching.**

Tell Liora helps a pregnant woman or a new mother decide, at any hour and with no signal, whether
what she feels means "go to the hospital now" or "this can wait for your check-up". She types or
says how she feels, in Tagalog, English or Taglish. Everything runs on her phone.

> **Status (9 Oct 2026, evening):** hackathon build in progress for the
> [AppBuildersPH Hackathon 2026](https://cerebralvalley.ai/e/appbuildersph-hackathon-2026)
> (theme: Local AI; code freeze 10:00 AM, 10 Oct 2026, Manila). The design and plan are done; the
> app is being built now. Features below are marked **planned** until they work on the demo
> iPhones, and this README is updated as each one lands.

## The moment we're solving

In the Philippines, a pregnant woman goes to the health centre herself; nobody visits her. So the
hard moment happens at home. It's 2 AM, she's 32 weeks pregnant, she has a bad headache and blurry
vision. The centre is closed, she has no load or signal, and she doesn't want to wake anyone over
something that might be nothing. Today she guesses, searches online, asks a Facebook group, or waits
until morning.

Context, from checked sources:

- After the late-2024 storms, birthing facilities in Bato, Bula and Nabua (Camarines Sur) closed
  temporarily, and flooding damaged medicines and emergency transport
  ([UNFPA Philippines, Dec 2024](https://unfpa.org/sites/default/files/resource-pdf/UNFPA%20Philippines%20Situation%20Report%20%231_%20Overlapping%20Tropical%20Cyclones.pdf)).
- In a 2026 survey, 69% of pregnant and 62% of postpartum respondents scored 13 or more on the
  EPDS depression screen, and only 2 of 500 postpartum respondents had received counselling. The
  sample was mostly recruited through Facebook ads and is not nationally representative
  ([Filoteo et al., BMJ Open, Feb 2026](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12918685/)).

## How it works

| Step | What happens |
| --- | --- |
| **Listen** | She types, or speaks for up to 30 seconds. Speech becomes text she can fix before sending. |
| **Understand** | Three readers turn her words into symptom codes: a word list, an embedding matcher (EmbeddingGemma 2), and Gemma 4 answering fixed, typed questions ("Does the message describe vaginal bleeding?") with a confidence for each answer. |
| **Decide** | A deterministic decision model built from WHO and DOH warning-sign tables makes the call: go to the hospital now, one fixed follow-up question, or a calm answer. |
| **Explain** | Fixed, pre-written screens; a card to show the nurse; and the WHO or DOH passage behind the answer, shown word for word. |
| **Remember** | Her log, a cycle calendar and an explained next-period estimate, stored only on her phone. |

**The AI only understands her words. Every decision comes from transparent rules she can see.**

### Jev-style typed decisions, on the phone

[Jev](https://typesafe.ai/), from TypeSafe AI, is a decision model that answers typed questions
(pick one option, score on a scale, or yes/no) with a confidence instead of generating text. It
runs only as a cloud service, so Tell Liora uses the same idea locally: Gemma 4 reads her message
once, and each question is answered by reading the probabilities of its listed options only (the
open [SemIf](https://github.com/TheoLeeCJ/SemIf-OpenJev) method). Nothing outside the options can
come back. If the model is unsure about a danger sign, Liora asks the follow-up question instead of
guessing. We make no claim that this matches Jev's accuracy; only our own measurements will be
reported.

## Safety by design

- **The AI never decides.** Every "go now", follow-up and calm outcome comes from rule tables, each
  with a WHO or DOH source.
- **Caution only goes up.** A danger sign found by any reader counts. Skipping the follow-up
  question counts as the serious case.
- **No AI-written medical text.** The "go now" and crisis screens use fixed copy. Source passages
  are shown verbatim, never paraphrased.
- **Works without the AI.** If the model cannot load, "AI off, checklist on" lets her tap her signs,
  and the same rules decide.
- **Not a medical device.** Liora doesn't diagnose or prescribe; it helps her decide when to go.
  There is no medicine advice, no diagnosis from photos of her body, and no fertile-window or
  birth-control prediction.
- **Private.** No account, no server, no analytics. After the first download the app makes no
  network requests, and "Delete everything" wipes all of her data.

## Features

| Feature | Status |
| --- | --- |
| Offline setup with per-model download progress | planned |
| Tell Liora by typing, and by voice | planned |
| Danger-sign decision, with one fixed follow-up question when unclear | planned |
| "Go to the hospital now" screen, Filipino first with English | planned |
| Nurse card: weeks, signs, severity, time, blood pressure | planned |
| Calm answer with a cited WHO or DOH source card | planned |
| Source-card search on the phone (multimodal embeddings) | planned |
| My log, with delete one and delete everything | planned |
| Private mood check (EPDS), with the crisis hotline on any self-harm answer | planned |
| AI-off checklist | planned |
| "How Liora decided" drawer: what each reader found, which rule fired, which models ran | planned |
| Cycle calendar and explained next-period estimate | planned |
| Stretch: read blood pressure and weeks from a photo of the check-up record | stretch |

## Why does this product benefit from running AI locally?

It works when there is no signal or load: at night, in a typhoon, in airplane mode. Her questions
about her body, her pregnancy and her mood never leave her phone. Answers come from the phone
itself, with no server round trip (measured times will be listed below). And with no per-question
cost, Liora can keep it free for every mother.

## Measured on the demo iPhones

**Not measured yet.** Every number in this section will be measured on the iPhone 17 and
iPhone 17 Pro (iOS 27.2, Safari and the Home Screen web app). No number is quoted from vendors.

| Measurement | iPhone 17 | iPhone 17 Pro |
| --- | --- | --- |
| First download size | not measured | not measured |
| Cold and warm load time | not measured | not measured |
| Time from message to result | not measured | not measured |
| Transcription time for a 10 s clip | not measured | not measured |
| Danger-sign recall on the 30-case Taglish test set | not measured | not measured |

## Models

All models run on the device, in Web Workers, through
[Transformers.js](https://github.com/huggingface/transformers.js) 4.3.1 on WebGPU (with a WASM
fallback). Sizes are Hugging Face file sizes, not our measurements.

| Role | Model | Licence | Download |
| --- | --- | --- | --- |
| Understanding text and voice; typed decisions | [Gemma 4 E2B](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX) | Apache-2.0 | decoder ~1.5 GB, plus token embeddings and a ~172 MB audio encoder |
| Multimodal retrieval of source cards | [EmbeddingGemma 2](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX) | Apache-2.0 | ~157 MB text model |

Fallbacks, used only if Gemma 4 does not fit Safari's memory on the iPhones: a 2-bit build of
Gemma 4 E2B; Gemma 3 1B on [WebLLM](https://github.com/mlc-ai/web-llm); and
[Laya-multilingual](https://github.com/NandhaKishorM/laya) (Apache-2.0) for typed decisions.
Whisper base, multilingual-e5-small and Florence-2 are per-task fallbacks. The models that actually
ship will be listed here.

## Tech stack

Expo SDK 57 exported for the web, Expo Router, React 19.2, React Native 0.86 with React Native Web,
NativeWind 4.2 with Tailwind 3.4, Reanimated 4.5, Zustand 5, Zod 4, date-fns 4, TypeScript 5.9.
Models run in two Web Workers bundled with esbuild. Data is stored in IndexedDB (idb-keyval). Offline
support comes from a Workbox service worker. Tests use Vitest. Hosting will be GitHub Pages.

## Recreate it

```bash
git clone https://github.com/joshfermano/liora-local.git
cd liora-local
bash scripts/setup-dev.sh   # commit-message hook and the agent skills used to build it
```

The app's own commands arrive with the scaffold, and this section will list them:
`pnpm install`, `pnpm test`, `pnpm typecheck`, and `npx expo export -p web` for the web build.

## Repository guide

| Path | What it is |
| --- | --- |
| `docs/superpowers/specs/2026-10-09-tell-liora-design.md` | The build spec: requirements, pipeline, decision model, models, timeline |
| `docs/research-summary.md` | Verified facts, refuted claims, open questions |
| `PRODUCT.md`, `DESIGN.md` | Product context and the design system (Capiz Light) |
| `HANDOFF.md` | Current status, decisions and next steps |
| `AGENTS.md`, `CLAUDE.md` | Instructions for coding agents, including the commit convention |
| `.claude/agents/` | Six project subagents used to build the app |

## Sources

| Source | Used for | Status |
| --- | --- | --- |
| WHO ANC Digital Adaptation Kit (2021), decision tables ANC.DT.01 and ANC.DT.17 | Danger signs and urgent referral | Verified |
| DOH Mother and Child Book | Mother-facing warning signs and source cards | Being transcribed with page references |
| WHO Pregnancy, Childbirth, Postpartum and Newborn Care (PCPNC) | Danger signs, normal changes, source cards | Being transcribed |
| Cox, Holden & Sagovsky (1987), Edinburgh Postnatal Depression Scale | Mood check | Items to be cited verbatim |

No rule or card ships without a cited source.

## Disclosures

- **Models:** listed above. All run on the device.
- **Technologies:** listed under Tech stack.
- **APIs and cloud services:** none at runtime. The first load downloads the app from GitHub Pages
  and the model weights from Hugging Face.
- **Runs locally:** speech recognition, multimodal embeddings and retrieval, typed decisions, the
  rule-based decision model, the mood check, and storage. **Needs internet:** the first download
  only.
- **Existing code and assets:** no existing code; every source file was written during the
  hackathon. WHO and DOH passages and the EPDS are cited third-party content. The typed-decision
  method follows TypeSafe AI's public description of Jev and
  the open SemIf method; no TypeSafe code or service is used.
- **AI development tools:** [Claude Code](https://claude.com/claude-code) (Anthropic), with the
  agent skills listed in `skills-lock.json` and the project subagents in `.claude/agents/`.

## Team

To be added before submission.

## After the hackathon

The decision model, word list, source cards and test set are plain TypeScript and data, so they
can move into a native app unchanged, with the browser models swapped for native on-device
runtimes. WHO content licences (commonly CC BY-NC-SA) will be reviewed before any
commercial use.
