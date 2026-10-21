# Submission sheet: Tell Liora

Each answer is one line, so it pastes cleanly into the Cerebral Valley form. Deadline 10:00 AM, 10 Oct 2026, no extensions.

### Team Name

Team Potato

### Team Members (separated by comma)

Josh Khovick Fermano, Ivan Reeve Lopez, Inaki Manuel Flores, Uriel Papa

### Project Name

Tell Liora

### Project Description

Tell Liora is an offline AI companion for Filipino mothers. She types or says how she feels in Tagalog, English or Taglish, Gemma 4 runs entirely on her iPhone, and rules written from WHO guidance tell her whether to go to the hospital now, go to the health centre as soon as possible, or wait, with the WHO source shown word for word. It also logs her cycle, moods and symptoms, and works in airplane mode.

### GitHub Repository

https://github.com/joshfermano/liora-local

### Hardware Tested On

iPhone 17 Pro (iOS 27.2) as the demo phone and the only phone for measured numbers; iPhone 16 Pro Max for development testing; builds on a Mac with Xcode 27.

### Demo Video (around 1 minute)

[add the video link]

### Screenshots

Take from the release build with airplane mode visible: Liora chat logging a period by voice with Undo; the red go-now card with Call and Text; "Go to the health centre as soon as possible" with the WHO passage; the nurse handoff report; the Calendar with the next-period estimate; the Sources screen. Avoid any screen showing a real phone number.

### X / LinkedIn Video URL

[add the post link; the post must tag Devin / Cognition and #AppBuildersPH]

### What Runs Locally

Everything, in airplane mode: the Liora chat agent (Gemma 4 E2B), voice to text (Gemma 4 audio encoder), source search (EmbeddingGemma 300M), the WHO rule-based decisions, cycle and fertile-window estimates, the mood check, the nurse report PDF, Face ID and all of her data.

### What Requires Internet

Only the one-time model download at setup (about 3.5 GB from Hugging Face, on Wi-Fi). Two things she chooses to do leave the app: opening an official WHO or DOH document link, and Call or Text through the phone's own apps.

### Models Used

Gemma 4 E2B instruct (Q4_0 GGUF) and its audio encoder (Q8_0), and EmbeddingGemma 300M (QAT Q4_0 GGUF). All Apache-2.0, all running on the iPhone through llama.rn (llama.cpp on Metal).

### Technologies and Frameworks

Expo SDK 57 (native iOS build), React Native 0.86, React 19.2, Expo Router, NativeWind 4.2 with Tailwind 3.4, Reanimated 4.5, Zustand 5, Zod 4, date-fns 4, TypeScript 6.0, llama.rn 0.13.0-rc.7, Vitest.

### APIs and Cloud Services

None at runtime. Hugging Face hosts the model files for the one-time download, and the code is on GitHub.

### Existing Code and Assets

No existing code; every source file was written during the hackathon. Open-source npm libraries, the Marcellus font (SIL Open Font License) and Apple's SF Symbols are used as published. WHO and DOH passages and the PHQ-9 are cited third-party content. The app icon and illustrations were drawn during the hackathon.

### AI Development Tools

Claude Code (Anthropic; Claude Opus 5.5 with Claude Sonnet 5.5 and Claude Haiku 5.5 subagents) with the agent skills in skills-lock.json, and Codex (OpenAI). Higgsfield for the demo video's story scenes only.

### Why does this product benefit from running AI locally?

It works with no signal or load: at 2 AM, in a typhoon, in airplane mode. Her words about her body, her pregnancy and her moods never leave her phone. And with no per-question cost, it can stay free for every woman.
