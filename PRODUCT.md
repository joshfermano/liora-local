# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

A mobile web app, iPhone first: Safari and the Home Screen web app on the iPhone 17 and iPhone 17
Pro (iOS 27.2), plus current desktop Chrome and Safari. It follows iOS conventions where
the web can carry them. There is no native build.

## Stack

Decided before this file, in the build spec (`docs/superpowers/specs/2026-10-09-tell-liora-design.md`
section 10): Expo SDK 57 exported for web, Expo Router, React Native Web, NativeWind 4.2 with
Tailwind 3.4, Reanimated 4.5. Models run in two Web Workers on Transformers.js: Gemma 4 E2B for
understanding her words and voice as Jev-style typed decisions, and EmbeddingGemma 2 for
multimodal retrieval. Storage is IndexedDB, offline is a Workbox service worker, and hosting
is GitHub Pages once the user approves the public repo.

## Users

**Primary.** A pregnant woman, or a mother in the weeks after birth, in the Philippines, on her own
phone. She goes to the health centre herself; nobody visits her. The hard moment is at home, often
at night, deciding alone whether what she feels means "go to the hospital now" or "this can wait
for your check-up". She may have no signal or load. She speaks Tagalog, English or Taglish. She may
be in pain, scared, tired, or reading in a second language.

**Secondary.** A woman tracking her cycle. She logs periods, symptoms and moods with the same input,
sees them on a calendar, and gets an explained next-period estimate.

**Also reads the app.** The nurse or midwife at the hospital, who is handed the phone and reads the
nurse card. They read it; they do not operate the app.

## Product Purpose

Tell Liora helps her decide, at any hour and with no signal, whether to go now. She types or says
how she feels. On-device models translate her words into symptom codes, a fixed decision
model built from WHO and DOH sources decides, and the cited passage behind the answer is shown word
for word. It also keeps her period, symptom and mood log.

Intended impact (goals, not measured results): mothers with real danger signs go sooner; mothers
with normal symptoms get calm, cited reassurance instead of a costly night trip; sadness after birth
gets noticed privately, with help one tap away.

## Positioning

The AI only understands her words; it never decides and never writes medical text. Every decision
comes from rule tables she can see, with a WHO or DOH source on each, and the "How Liora decided"
record shows what each translator found and which rule fired. Her words become Jev-style typed
decisions, each with a confidence, computed on the phone; Jev itself is a cloud service. All of it runs on her phone, so it
works with no signal, no account and no per-question cost. Today she would guess, search online, ask
a Facebook group, or wait until morning.

Value proposition: "Know when to go, even with no signal and no one watching."

## Operating Context

- **The real scene:** 2 AM, a dark room, often one hand, possibly in pain, the centre closed, no
  signal or airplane mode. Then, at the hospital, the phone is handed to a nurse.
- **First open needs internet once:** setup downloads the app and the models, then everything works
  offline. The Home Screen web app keeps its own storage, so setup runs inside it once.
- **Daily use** is seconds: one message, or one tap on the calendar.
- **The hackathon:** AppBuildersPH Hackathon 2026, theme "Local AI". Code freeze 10:00 AM, 10 Oct
  2026, Manila. The demo is live, in airplane mode, on the two iPhones; judges also read the public
  repo.

## Capabilities and Constraints

- The must-have and stretch features are the spec's FR list (section 3). Out of scope: diagnosis
  from photos of the body, medicine advice, fertile-window or ovulation predictions, contraception
  guidance, partner mode, sexual-activity logging, accounts, sync, cloud AI, notifications.
- **The AI never decides and never writes medical text.** The "go to the hospital now" and crisis
  screens use fixed copy. Source cards are shown verbatim. A danger sign found by any translator
  counts; skipping a follow-up question counts as serious.
- **If the AI is unavailable,** the "AI off, checklist on" path feeds the same decision model.
- **Language:** the input prompt, follow-up questions, "go now" screen, nurse card and crisis screen
  are Filipino first with English underneath. Everything else is English.
- **On every screen:** "Liora doesn't diagnose. It helps you decide when to go." A persistent "Stays
  on this phone" note, and "Delete everything".
- **Nothing leaves the phone** after setup: no analytics, no error reporting, no network requests.
- **Undecided** (do not invent answers):
  - whether Gemma 4 E2B fits the iPhones or a fallback ships (the S1 test decides);
  - the DOH Mother and Child Book and WHO PCPNC passages (task R2);
  - the EPDS item wording and the national crisis hotline number (task R3), from official sources;
  - whether the calendar draws the estimate's whole window dashed, or only the predicted period
    days (HANDOFF.md section 10).

## Brand Commitments

- **Name:** the product is **Tell Liora**; the app shows the wordmark "Liora".
- **Voice** (user, 2026-10-09): warm, gentle, private, medically careful, family-centred and
  inclusive, made plainer when it matters. On the "go now" and crisis screens: short, direct
  sentences, Filipino first. Faith-inspired values stay in the background and never appear in the
  words. No exclamation marks in health contexts. No stock wellness copy ("sanctuary", "journey").
- **Look** (user, 2026-10-09): the Capiz Light design system in `DESIGN.md`: its colours, type,
  spacing and radii, the rule that logged days are solid and estimates are hollow and dashed, the
  banned "AI look" list, light and dark as equals, and one calm entrance per screen. Not in this
  build, because the web or the deadline cannot carry them: glass bars, widgets, notifications,
  sign-up, choreographed screen transitions, and illustrated artwork on every screen.

## Evidence on Hand

- Build spec: `docs/superpowers/specs/2026-10-09-tell-liora-design.md`. The demo script and judge
  Q&A are in `HANDOFF.md` section 10; its sketch copy is placeholder and must never ship.
- Facts safe to quote, and claims that failed checking: `docs/research-summary.md`.
- Verified rule sources: WHO ANC Digital Adaptation Kit ANC.DT.01 (danger signs) and ANC.DT.17
  (blood pressure with proteinuria). Everything else is pending, as listed above.
- There are no users, testimonials, clinical validation, regulatory clearance or measured numbers
  yet. Every number in the README or the pitch must be measured on the two demo iPhones; fake
  benchmarks disqualify the team.
- No medical content may be invented, including in mockups, fixtures and placeholder copy.

## Product Principles

1. **The AI translates; the rules decide.** Every medical call is plain, tested code with a source.
2. **Caution only goes up.** Any translator's danger finding counts, and an unanswered question
   counts as serious.
3. **Show the source, word for word.** No model paraphrases medical text.
4. **Works with no one and nothing:** no signal, no account, and no AI, through the checklist.
5. **Calm, except when it must not be.** Only the "go now" screen shouts.

## Accessibility & Inclusion

- Touch targets of at least 44pt; WCAG AA contrast in light and dark.
- Every control has a screen-reader label; colour is never the only signal.
- Reduce Motion is honoured; text survives Safari's larger text sizes without clipping.
- Voice input and one question per screen help tired and low-literacy users.
- She is not assumed to be married, Christian, or pregnant; setup questions are optional.
