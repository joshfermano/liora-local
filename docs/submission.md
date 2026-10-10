# Submission sheet: Tell Liora

Paste-ready answers for the Cerebral Valley form (deadline 10:00 AM, 10 Oct 2026, no extensions).
Every claim here matches the README; fill the two blanks marked **[to add]** before submitting.

## The project

- **Project name:** Tell Liora
- **Short description:** An offline AI companion for Filipino mothers: she types or says how she
  feels in Taglish, Gemma 4 runs on her iPhone, and WHO-based rules tell her whether to go to the
  hospital now, go to the health centre as soon as possible, or wait, with the WHO source word for
  word. It also logs her cycle, moods and symptoms, and works in airplane mode.
- **Team name and members:** Team Potato: Josh Khovick Fermano, Ivan Reeve Lopez, Inaki Manuel
  Flores, Uriel Papa (each must be on the appbuildersph.com/hackathon list).
- **GitHub repository:** https://github.com/joshfermano/liora-local (public; recreate steps in the
  README).
- **Hardware tested on:** iPhone 17 Pro (iOS 27.2), the demo phone and the only phone for measured
  numbers; iPhone 16 Pro Max for development testing; builds on a Mac with Xcode 27.

## The proof

- **Demo video (around 1 minute):** **[to add]** (storyline and prompt in
  `docs/video/higgsfield-video-prompt.md`; every app screen is a real recording).
- **Screenshots** (from the release build on the iPhone 17 Pro, airplane mode visible):
  1. Liora chat logging a period by voice, with Undo.
  2. The red go-now card with Call / Text.
  3. "Go to the health centre as soon as possible" with the WHO passage.
  4. The nurse handoff report.
  5. Calendar with the next-period estimate.
  6. The Sources screen.
- **X / LinkedIn video URL:** **[to add]**. The post must tag Devin / Cognition and #AppBuildersPH.
- **What runs locally:** everything, in airplane mode: the Liora chat agent (Gemma 4 E2B), voice to
  text (Gemma 4 audio encoder), source search (EmbeddingGemma 300M), the WHO rule-based decisions,
  cycle and fertile-window estimates, the mood check, the nurse report PDF, Face ID and all data.
- **What requires internet:** only the one-time model download at setup (about 3.5 GB from Hugging
  Face, on Wi-Fi). Two things she chooses to do leave the app: opening an official WHO or DOH
  document link, and Call / Text through the phone's own apps.

## The disclosures

- **Models used:** Gemma 4 E2B instruct (Q4_0 GGUF) and its audio encoder (Q8_0); EmbeddingGemma
  300M (QAT Q4_0 GGUF). All Apache-2.0, all run on the iPhone through llama.rn (llama.cpp, Metal).
- **Technologies and frameworks:** Expo SDK 57 (native iOS build), React Native 0.86, React 19.2,
  Expo Router, NativeWind 4.2 / Tailwind 3.4, Reanimated 4.5, Zustand 5, Zod 4, date-fns 4,
  TypeScript 6.0, llama.rn 0.13.0-rc.7, Vitest.
- **APIs and cloud services:** none at runtime. Hugging Face hosts the model files for the one-time
  download; the code is on GitHub.
- **Existing code and assets:** no existing code; every source file was written during the
  hackathon. Open-source npm libraries, the Marcellus font (SIL OFL) and Apple's SF Symbols are used
  as published; WHO and DOH passages and the PHQ-9 are cited third-party content. The app icon and
  illustrations were drawn during the hackathon.
- **AI development tools:** Claude Code (Anthropic; Claude Opus 5.5 with Sonnet 5.5 and Haiku 5.5
  subagents) with the skills in `skills-lock.json`; Codex (OpenAI); Higgsfield for the demo video's
  story scenes.

## Why does this product benefit from running AI locally?

It works with no signal or load: at 2 AM, in a typhoon, in airplane mode. Her words about her body,
her pregnancy and her moods never leave her phone. And with no per-question cost, it can stay free
for every mother.
