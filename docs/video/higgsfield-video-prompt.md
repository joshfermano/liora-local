# Prompt: Tell Liora demo video (Claude Opus 5.5 + Higgsfield MCP)

Paste everything below the line into Claude Code (Claude Opus 5.5) with the Higgsfield MCP / CLI
signed in and the `higgsfield-generate` and `motion-graphics` skills available. Record the screen
clips listed in "Assets" first, from the **release build** on the iPhone 17 Pro.

---

You are the director and editor of a 60-second demo video for **Tell Liora**, an iPhone app built
for AppBuildersPH Hackathon 2026 (theme: Local AI). Plan it, generate the story scenes with
Higgsfield, build the titles and callouts with the `motion-graphics` skill, and assemble one
finished video. Ask me before spending Higgsfield credits on more than 8 generations.

## What Tell Liora is (facts you may state; do not add others)

- Tell Liora helps a Filipina woman track her cycle, her moods and symptoms, her pregnancy and the
  weeks after birth, and decide at any hour, with no signal, whether a symptom means **go to the
  hospital now**, **go to the health centre as soon as possible**, or **it can wait**.
- **Everything runs on the phone, fully offline after setup.** No account, no cloud, no data leaves
  the phone. The models, all through llama.rn (llama.cpp on the iPhone GPU with Metal):
  - **Gemma 4 E2B instruct (Q4_0)**: understands her Taglish words and powers the chat agent.
  - **Gemma 4 E2B audio encoder**: turns her voice into text, on the phone.
  - **EmbeddingGemma 300M**: finds the reviewed WHO / DOH passage closest to her question.
- **The AI never decides.** Decisions come from fixed rules written from WHO guidance (the WHO
  antenatal care digital adaptation kit and WHO's *Pregnancy, childbirth, postpartum and newborn
  care* guide). Urgent screens use fixed words; sources are shown word for word.
- **The agent**: she types or speaks; Liora logs her period, flow, symptoms and moods with Undo,
  answers from her own data, follows her mood (upbeat on a good day, gentle on a hard one), and
  refuses prompt-injection attempts.
- **Safety**: on a danger sign, a red **go-now** screen with **Call / Text** her emergency contact;
  if she pushes back ("Kaya ko pa naman"), Liora keeps the go-now in front of her. A **nurse handoff
  report** (her details, blood type, her words, the signs, the WHO rule with its citation, the last
  7 days) can be shared as a PDF. "How Liora decided" and a **Sources** screen show the official
  documents.
- Not a diagnosis tool. Never say it diagnoses, treats, or replaces a health worker.

## Hard rules for the video

1. **Every app screen is a real screen recording** from the assets below. Never generate, redraw or
   imitate the app's UI, and never let a generated shot show a readable phone screen (show phones
   from behind, angled away, or with a soft glow only).
2. **No invented numbers.** Show a timing or size only if I filled it in under "Measured numbers";
   otherwise leave numbers out. Model file sizes may appear only as "on-device" facts above.
3. No real person's likeness, no celebrity look-alikes, no WHO, DOH, Google or other logos (say
   "WHO guidance" in words only), no blood or medical procedures on screen, no lip-sync.
4. The persona is **Gweny**, a fictional Filipina woman in her late twenties, shown with warmth and
   dignity; stylised, not photoreal, and consistent across shots.
5. Captions burned in for every spoken line.

## Look (the app's "Capiz Light" design system)

- **Idea:** a capiz window: translucent, light comes in, the room stays private. At 2 AM the phone
  is the one lit window in a dark house. The app icon is that window.
- **Palette (flat, no gradients except one soft dawn light):** Night Window `#1D1519`, Pearl Ground
  `#F2ECF1`, Deep Peony `#C2255C` (action, period), Rose Wash `#FBE4EE`, Lit Shell `#FBCFA8` (warm
  window glow), Hardwood `#5E4036` (window frame), Mulberry `#743C62` (mood). Alarm Red `#C8102E`
  appears **only** on the go-now moment.
- **Type:** Marcellus for titles; a clean system sans for captions and callouts.
- **Motion:** calm and modern: slow push-ins, soft light blooms through capiz panes, one calm entrance
  per scene; the go-now beat is the only sharp, urgent cut.
- **Sound:** soft piano and room tone; a low pulse under the danger beat; resolves warm at the end.
  Narrator: warm, calm female voice, English, with her Taglish lines on screen as she says them.

## Assets (record these first; real app, iPhone 17 Pro, release build)

- A. Airplane mode on, Tell Liora opens, "AI on".
- B. Liora Live (voice): "Niregla ako today, medyo malakas, tapos may cramps ako" → period start,
  heavy flow and cramps saved with Undo.
- C. Chat: "masaya at kalmado ako ngayon" → upbeat reply; Today shows "Logged today".
- D. Calendar: logged period days, the dashed next-period estimate and the estimated fertile window.
- E. Profile: name, blood type, emergency contact; status changed to Pregnant, week 32 (and, for
  after birth, the "after birth" status).
- F. Chat: "nilalagnat ako" → "Are you too weak to get out of bed?" → No → "Go to the health centre
  as soon as possible" with the WHO passage.
- G. Chat: "sobrang sakit ng ulo ko tapos malabo ang paningin ko" → red go-now card, Call / Text.
- H. Chat: "Kaya ko pa naman" → the go-now held in view.
- I. Nurse report → Share as PDF sheet; How Liora decided → Sources screen.
- J. The app icon on the Home Screen.

## Storyline and shot list (60 seconds)

| Time | Beat | Higgsfield scene (stylised, no readable screens) | Real footage | On-screen text | Narration |
| --- | --- | --- | --- | --- | --- |
| 0–6s | **2 AM** | A quiet Filipino home at night; one capiz window glowing warm amber; slow push-in | — | "2 AM. No signal." | "At two in the morning, with no signal, who does she ask?" |
| 6–12s | **On her phone, offline** | Gweny's hands holding a phone, its glow on her face, screen angled away | A | "Airplane mode. Gemma 4 on-device." | "Tell Liora runs Gemma 4 entirely on her phone. No cloud, no account." |
| 12–22s | **She just talks (voice + chat)** | Morning light through capiz panes; Gweny speaking softly to her phone | B, C | "Speak Taglish. Liora logs it." · "Undo anytime" | "She just talks. Liora logs her period, her symptoms and her mood, and answers kindly." |
| 22–27s | **Her cycle** | Calendar pages turning into capiz squares | D | "Estimates, never contraception" | "It learns her cycle and explains every estimate." |
| 27–31s | **Her profile, her life** | Season shift: the same window, a nursery corner appears | E | "Months later: 32 weeks pregnant" | "When she's pregnant, and after birth, the WHO rules switch on." |
| 31–36s | **Not every symptom is an emergency** | — | F | "WHO: as soon as possible" | "Not every symptom is an emergency. Liora asks WHO's own question first." |
| 36–46s | **The danger sign** | Night again; the room dark, the window's warm glow turns urgent red for one beat | G, H | "Go now. Fixed WHO words, no AI text." · "Call Josh" | "But a severe headache with blurred vision means go now, and Liora doesn't let go." |
| 46–54s | **The report** | A nurse's hands receiving the phone (screen not visible) | I | "Nurse report · Share as PDF" · "Every answer cites WHO" | "At the hospital, the nurse gets her report, with the WHO source behind every answer." |
| 54–60s | **Close** | The house at dawn; the capiz window becomes the app icon | J | "Tell Liora" · "Know when to go, even with no signal and no one watching." | "Tell Liora. Know when to go." |

Feature coverage you must keep: offline AI with the named models (6–12s), cycle logging (12–27s),
mood and symptoms (12–22s), pregnancy and after birth (27–31s), profile (27–31s, short), and the
priorities: **AI chat, AI voice, and the safety flow with the report** (12–22s, 31–54s).

## Measured numbers (fill in from the iPhone 17 Pro, or leave blank and omit)

- Gemma 4 cold load: ____ s · Time from message to decision: ____ s · Voice transcription (10 s
  clip): ____ s

## How to build it

1. Lock one visual style for all Higgsfield scenes (stylised, warm, Capiz Light palette) and keep
   Gweny consistent; generate each scene once, review, and regenerate only if a rule above is broken.
2. Build titles, callouts, the model credit card and the logo sting with `motion-graphics`, using the
   palette and Marcellus.
3. Cut the real screen recordings in at full fidelity (crop to the phone, no redrawing); add callouts
   on top.
4. Assemble: 1920×1080, 30 fps, about 60 seconds, burned-in captions, music and narration mixed
   under −14 LUFS; also export a 1080×1920 vertical cut for X / LinkedIn.
5. Before export, check: every UI shot is real footage; no invented number; no logos; every feature
   in "Feature coverage" appears; the go-now beat is the only red moment; captions match the audio.
