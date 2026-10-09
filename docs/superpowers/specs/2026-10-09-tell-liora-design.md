# Tell Liora: build spec (Claude Code handoff)

**Event:** AppBuildersPH Hackathon 2026, theme "Local AI"
**Repo:** `liora-local` (new, started 2026-10-09)
**Code freeze:** 10:00 AM, 10 Oct 2026, Asia/Manila. One submission only. Repo must be public by then.
**Spec version:** 4 (v2 added voice input, local embeddings / RAG over source cards, and the check-up photo as stretch; v3 adds the cycle calendar and next-period prediction, FR-17 and FR-18; v4, directed by the user on the evening of 2026-10-09, makes Gemma 4 E2B the on-device model, adds a local Jev-style typed-decision model, and moves retrieval to the multimodal EmbeddingGemma 2)
**Status:** scope approved by the team 2026-10-09.

---

## 0. How to use this document

This is the source of truth for the build. Each requirement has an ID (`FR-`, `NFR-`, `SR-`).
Build in the order of section 17. When a requirement and an implementation idea conflict, the
requirement wins. When this document and a library's real API disagree, check
`node_modules/<pkg>` and follow the installed version.

### House rules for the build

- **Package manager:** pnpm only. `.npmrc` must contain `node-linker=hoisted` (Metro does not
  follow pnpm symlinks).
- **Never declare `react-native-css-interop`** in `package.json`. NativeWind pins its own copy; a
  second copy silently unstyles the whole app.
- **Never use function-form styles** (`style={({ pressed }) => ...}`). NativeWind's interop drops
  them. Use a pressable component that reads pressed state into a class or a Reanimated style.
- **Default to no comments.** Only explain a non-obvious why.
- **No made-up medical content**, anywhere, including fixtures and placeholder copy. Medical text
  only comes from source cards (section 9) with a citation.
- **Commit messages:** Conventional Commits (`feat(rules): add ...`), first line under 70
  characters, body explains why. No AI assistant as a co-author. Details in `AGENTS.md`.
- **TDD for `src/core/`:** write the failing test first.
- **Every number in the pitch or README must be measured** (section 15). Fake benchmarks
  disqualify the team.

---

## 1. Product summary

**Tell Liora helps a pregnant or new mother decide, at any hour and with no signal, whether what
she feels means "go to the hospital now" or "this can wait for your check-up". It also keeps her
period, symptom and mood log. Everything runs on her phone.**

She types or speaks the way she talks, in Tagalog, English or Taglish. On-device AI turns her words
into structured logs. A deterministic **decision model** built from WHO and DOH sources checks
every entry for danger signs. **Source cards** retrieved with on-device embeddings show her the WHO
or DOH passage behind an answer. The AI never makes a medical decision and never writes medical
text.

- **Primary user:** a pregnant woman or a mother in the weeks after birth, on her own iPhone or a
  laptop browser. In the Philippines she goes to the centre herself; nobody visits her. The hard
  moment is at home, often at night, deciding alone whether to go.
- **Secondary:** a woman tracking her cycle: she logs periods, symptoms and moods with the same
  input, sees them on a calendar, and gets an explained next-period prediction.
- **Value proposition:** "Know when to go, even with no signal and no one watching."
- **Why local:** works with no signal or load; her words never leave the phone; answers in
  seconds; no per-question server cost, so it can stay free.

### Judging fit

| Criterion | Weight | Answer |
| --- | --- | --- |
| Problem & Usefulness | 25% | A real moment (alone, at night, deciding whether to go), a clear user (the mother). |
| Local AI Implementation | 25% | Gemma 4 E2B on the phone understands her text and voice (and, stretch, a check-up photo) and answers Jev-style typed questions with a confidence; EmbeddingGemma 2 puts text and images in one space for retrieval. Offline and privacy are the point. |
| Technical Execution | 20% | Decisions are plain, tested code. If any model fails, the checklist path still works. |
| Innovation | 15% | Spoken or typed Taglish turned into Jev-style typed decisions with a confidence, fully on-device (Jev itself is cloud-only), feeding WHO/DOH decision tables, with an on-screen record proving the AI did not decide. |
| Product & Demo | 15% | Airplane-mode demo on two iPhones: spoken danger sign, calm answer with source card, mood check. |

---

## 2. Rules compliance

- **All code is written fresh, in this repo, during the hackathon.** Nothing is copied from another
  project.
- **Third-party content is cited:** WHO and DOH passages and the EPDS (section 8), and the open
  models and methods in section 10.

---

## 3. Functional requirements

### Must have at 10 AM

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-1 | **First open and offline setup** | Shows "Getting Liora ready for offline" with per-model progress. Downloads the app shell, the text model and the embedding model. Asks optional questions: pregnant (weeks), recently gave birth (days since), or neither; if neither, when her last period started and her usual cycle length. After completion, reloading in airplane mode works. |
| FR-2 | **Tell Liora (text)** | One text box, label "Ano'ng nararamdaman mo?" with "How are you feeling?" below. Submitting runs the pipeline in section 5 and shows a result. |
| FR-3 | **Voice input** | A mic button records up to 30 s. On-device speech recognition (Gemma 4 E2B's audio input; Whisper base as fallback) transcribes it into the text box, where she can edit before submitting. Audio is never stored or sent. Works in airplane mode once the speech model is cached. |
| FR-4 | **Danger-sign decision** | Every message is evaluated by the decision model (section 8). Vague findings trigger a fixed follow-up question. Skipping the follow-up resolves to the serious case. |
| FR-5 | **"Go to the hospital now" screen** | Fixed copy in Filipino and English, the sign(s) that fired, and the rule's source. Zero generated text. Urgent colour plus icon plus words (never colour alone). |
| FR-6 | **Nurse card** | One tap from FR-5 opens a full-screen card: pregnancy weeks or days since birth, reported signs with severity, time logged, any BP she entered. Large type, high contrast. |
| FR-7 | **Calm answer with source card** | When no rule fires: fixed calm copy for the logged entries, the "go now if you notice" list, and the best-matching source card (FR-8) or "Ask at your check-up" if none clears the threshold. |
| FR-8 | **Source cards (RAG)** | On-device multimodal embedding search (EmbeddingGemma 2) over 30 to 50 cited WHO/DOH passages. Shown verbatim with source and page. On a "go now" result, "Why?" shows the card linked to the fired rule by ID (direct link, not retrieval). |
| FR-9 | **My log** | Entries newest first, grouped as period, symptoms, mood, pregnancy. Delete one; delete everything. |
| FR-10 | **Mood check (PHQ-9; was EPDS until 2026-10-09)** | 9 items word for word from the official PHQ-9 form, one per screen, scoring 0 to 27. Total of 10 or more (Kroenke, Spitzer and Williams 2001) shows "talk to a health worker" copy. Any non-zero answer on item 9 (self-harm) immediately shows the crisis screen with the NCMH hotline, before finishing. Switched from the EPDS for licensing: the PHQ-9 form says "No permission required to reproduce, translate, display or distribute". |
| FR-11 | **AI-off checklist** | If the text model is unavailable, Liora shows "AI off, checklist on" and offers a tap-the-signs checklist that feeds the same decision model. |
| FR-12 | **"How Liora decided" drawer** | On every result: findings per source (word list, embeddings, the AI's typed decisions with their confidence), the rule IDs that fired with sources, and model IDs and versions. |
| FR-13 | **Privacy surface** | Persistent "Stays on this phone" note. "Delete everything" wipes IndexedDB entries, setup answers, mood results and period history. |
| FR-17 | **Cycle calendar** | Month view with previous/next month. Logged period days are drawn solid; predicted days hollow and dashed (DESIGN.md). Days with symptoms or moods show a small dot. Today is ringed. Tapping a day lists that day's entries and offers "Mark period start" / "Mark period end" so she can log without typing. Period entries from Tell Liora ("nagsimula regla ko kahapon") appear on the calendar after she confirms the resolved date. While she is pregnant or postpartum, the calendar shows entries and pregnancy weeks instead of predictions. |
| FR-18 | **Next-period prediction** | Deterministic, explained, with confidence (section 8, "Cycle prediction"). Shows "Next period around <date>", the basis ("based on 3 cycles" or "based on the cycle length you told us") and confidence (low, medium, high). Footer: "Not for birth control." No fertile-window or ovulation prediction. |

### Stretch, in this order, only after all must-haves pass on both iPhones

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-14 | **Photo of check-up record** | Camera or photo picker. On-device image reading (Gemma 4 E2B vision; Florence-2 as fallback) reads blood pressure, weeks (AOG) and next check-up date. Liora shows what it read as editable fields; nothing is saved until she confirms. The image is never stored. Values feed the nurse card and the decision model context. |
| FR-15 | **AI rewording of calm copy** | The text model may reword FR-7's fixed calm copy into simpler Taglish. Never on FR-5, FR-10's crisis screen, or source cards. |
| FR-16 | **Cebuano phrases** | Added to the word list and embedding prototypes. |

### Explicitly out of scope

Diagnosing from photos of the body, reading or advising on medicines, fertile-window or ovulation
predictions, contraception guidance, partner mode, sexual-activity logging, accounts, sync, any
cloud AI, push notifications, a native App Store build, payments.

---

## 4. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | **Offline:** after first load, every must-have works in airplane mode on both iPhones. |
| NFR-2 | **No network after setup:** apart from first downloads, the app makes no network requests. Verified with Safari Web Inspector or the desktop network panel. |
| NFR-3 | **Platforms:** iPhone 17 and iPhone 17 Pro on iOS 27.2 (Safari, and as a Home Screen web app); latest desktop Chrome and Safari. |
| NFR-4 | **Responsiveness:** inference never blocks the UI (all models in Web Workers). Targets to measure, not to claim: text result under 10 s, 10-second voice clip transcribed under 8 s on iPhone 17. |
| NFR-5 | **Memory:** models load on demand and are released after use. Never more than the text model plus one Transformers.js model resident at once. |
| NFR-6 | **Resilience:** any model failure or timeout degrades to the word list plus checklist. The decision model never depends on a model being loaded. |
| NFR-7 | **Accessibility:** 44 pt targets, WCAG AA contrast in light and dark, screen-reader labels on every control, Reduce Motion honoured, Dynamic Type-friendly sizing. |
| NFR-8 | **HTTPS:** served over HTTPS (required by Safari for WebGPU, microphone and service workers). |

---

## 5. Pipeline

```
 voice ──► Gemma 4 audio, or Whisper ──► editable text ─┐
 photo ──► Gemma 4 vision (stretch) ──► confirmed context (BP, weeks, next visit)
                                                        │
 text ──────────────────────────────────────────────────┤
                                                        ├──► Word list          (main thread, instant)
                                                        ├──► Embedding matcher  (ml-worker, EmbeddingGemma 2)
                                                        └──► Typed decisions    (ai-worker, Gemma 4, Jev-style)
                                                          │
       merge: a danger code found by ANY source counts; severity = most serious;
       a danger answer in the uncertain confidence band becomes severity `unknown`
                                                          │
                                                  Decision model (pure TS)
                         ┌────────────────────────────────┼─────────────────────────────┐
                   needs severity                    rule fired                    no rule fired
                         │                                │                              │
               fixed follow-up question        FR-5 go-now + FR-6 nurse card     FR-7 calm copy +
                                               + linked source card              retrieved source card
                                                          │
                                       save entry (IndexedDB) ──► FR-9 My log
```

### Algorithms at a glance

No neural network makes a decision. Models only translate (speech to text, text to codes) and find
passages; every decision is transparent arithmetic or a rule table.

| Part | Algorithm | Kind |
| --- | --- | --- |
| Danger signs (FR-4) | Deterministic decision table from WHO ANC.DT.01 / DT.17 and DOH warning signs | Rules |
| Follow-up questions (FR-4) | Fixed question table; skip resolves to serious | Rules |
| Mood check (FR-10) | PHQ-9 validated sum score (0 to 27), cut-off 10, item-9 short-circuit | Scoring |
| Next-period estimate (FR-18) | Recency-weighted median of the last up to 12 cycle lengths, forgotten periods left out, range-based window, rule-based confidence label | Arithmetic |
| Source cards (FR-8) | Nearest-neighbour search by cosine similarity over multimodal embeddings (EmbeddingGemma 2: text and images in one space), with a threshold | Retrieval |
| Embedding matcher (safety) | Cosine similarity to hand-written symptom prototypes, add-only | Retrieval |
| Understanding text (FR-2, FR-4) | Jev-style typed decisions on Gemma 4 E2B: each question (choice, score or yes/no) is answered by restricting the next-token softmax to its listed options; the probabilities are the confidence | Model (translate only) |
| Voice (FR-3) | Gemma 4 E2B speech recognition (Whisper base fallback) | Model (translate only) |
| Merge | Union of findings; severity = most serious; an uncertain danger answer becomes `unknown` | Rules |

Pitch line: "The AI only understands her words. Every decision comes from transparent math and WHO
rules she can see."

### Local typed-decision model (Jev-style)

Jev is TypeSafe AI's "System One" decision model (early access since 15 Sep 2026). Given a state
and typed questions, it returns a choice, a rubric score or a yes/no probability, each with a
confidence, instead of generated text. It runs only as a cloud service, so Tell Liora cannot use
it. Tell Liora runs the same idea on the phone:

- **Method:** the open SemIf method (MIT, `TheoLeeCJ/SemIf-OpenJev`). Gemma 4 E2B reads her message
  once (cached), then each typed question is answered by reading the next-token probabilities of
  its listed options only, a softmax restricted to the options. No text is generated, so nothing
  outside the options can come back.
- **Question types:** `choice` (one of N listed codes: period event, when, flow, mood), `score`
  (an ordered rubric: severity mild, moderate or severe) and `yesno` (one per danger code, for
  example "Does the message describe vaginal bleeding?"). Questions live in `src/ai/questions.ts`
  and are input text, never advice.
- **Confidence bands:** for a danger `yesno`, p ≥ τ_hi adds the code with the scored severity;
  τ_lo ≤ p < τ_hi adds it with severity `unknown`, which asks the fixed follow-up (Jev's own
  guidance also escalates low-confidence decisions); p < τ_lo adds nothing. τ_lo is set low, in
  favour of caution. Both are tuned on the eval set (section 15).
- **Fallback model:** Laya-multilingual (`convaiinnovations/laya-multilingual`, Apache-2.0, 322M,
  mmBERT, 100+ languages) answers the same three question types in one forward pass and has a
  browser runner (`laya-ts`: split ONNX, WebGPU with WASM fallback; not on npm, so it is built from
  the repo). Its own benchmark shows weak zero-shot Tagalog (0.350 accuracy on a 20-option intent
  task, calibration error 0.430), so it is used only if Gemma 4 cannot load on the iPhones.
- **It never decides.** Typed decisions are findings with a confidence, like the word list's. The
  rules in section 8 make every call (SR-1 to SR-3).
- **No parity claim.** Never say "as good as Jev". Only our own eval numbers, measured on the
  iPhones, are quoted.

### Safety properties (tests must cover each)

- **SR-1** Models can only add caution. A danger code from any source survives the merge.
- **SR-2** The model only answers typed questions over closed option lists and never generates
  free text into the pipeline. An error or timeout equals "no findings"; the word list and
  embedding matcher still run.
- **SR-3** The decision model is pure, deterministic TypeScript with a source on every rule.
- **SR-4** Go-now and crisis screens contain only fixed copy.
- **SR-5** Unknown severity triggers a follow-up; skipping resolves to serious.
- **SR-6** Source cards are shown verbatim. No model paraphrases medical text (FR-15 rewords only
  the app's own calm copy).
- **SR-7** Retrieval never decides. It only chooses which cited card to display.

---

## 6. Data model

### Vocabulary

- **Flow:** `spotting`, `light`, `medium`, `heavy`
- **Symptoms:** `cramps`, `headache`, `back_pain`, `bloating`, `fatigue`, `mood_changes`, `acne`,
  `breast_tenderness`, `sleep_quality`, `energy`, `stress`, `appetite`, `nausea`, `pelvic_pain`
- **Moods:** `calm`, `joyful`, `energetic`, `romantic`, `tired`, `anxious`, `stressed`,
  `irritable`, `sad`

### Danger codes

From WHO ANC.DT.01 (verified): `vaginal_bleeding`, `convulsions`, `fever`, `severe_headache`,
`visual_disturbance`, `imminent_delivery`, `labour`, `looks_very_ill`, `severe_vomiting`,
`severe_pain`, `severe_abdominal_pain`, `unconscious`, `central_cyanosis`.

Added only when task R2 confirms a cited source: `reduced_fetal_movement`, `water_breaking`,
`swelling_face_hands`, `difficulty_breathing`, and postpartum codes.

### Types

```ts
type Severity = 'mild' | 'moderate' | 'severe' | 'unknown';
type FindingSource = 'lexicon' | 'embedding' | 'llm' | 'checklist';

interface Finding {
  code: DangerCode | Symptom;
  severity: Severity;
  sources: FindingSource[];
  confidence: number | null;        // typed-decision probability; null for lexicon and checklist
}

interface Extraction {              // assembled from typed decisions
  period: {
    event: 'started' | 'ended' | 'ongoing';
    when: 'today' | 'yesterday' | 'days_ago' | 'date' | 'unknown';
    days_ago: number | null;        // when === 'days_ago'
    date: string | null;            // YYYY-MM-DD, when === 'date'
    flow: Flow | null;
  } | null;
  symptoms: { code: Symptom; severity: Severity }[];
  moods: Mood[];
  danger_signs: { code: DangerCode; severity: Severity }[];
  pregnancy_weeks: number | null;
}

interface Context {
  status: 'pregnant' | 'postpartum' | 'neither';
  weeks?: number;
  days_since_birth?: number;
  bp?: { systolic: number; diastolic: number; recorded_at: string };   // FR-14 or manual
  proteinuria?: boolean;
}

interface Decision {
  level: 'go_now' | 'follow_up' | 'ok';
  fired: { rule_id: string; codes: string[] }[];
  follow_up?: { question_id: string; code: string };
}

interface Entry {
  id: string;                       // crypto.randomUUID()
  created_at: string;
  text: string;                     // her words, device only
  input: 'text' | 'voice' | 'checklist';
  findings: Finding[];
  extraction: Extraction | null;
  decision: Decision;
  card_ids: string[];
  models: { role: 'llm' | 'asr' | 'embedding' | 'ocr'; id: string; version: string }[];
}

interface MoodResult { id: string; created_at: string; answers: number[]; total: number; self_harm_flag: boolean }

interface PeriodRecord {            // one bleed; what the calendar and prediction read
  id: string;
  start: string;                    // YYYY-MM-DD, confirmed by her
  end: string | null;
  flow_by_day: Record<string, Flow>;
  source: 'tell' | 'calendar' | 'setup';
}

interface CycleSettings { stated_cycle_length?: number; stated_period_length?: number }

interface Prediction {
  next_start: string;               // YYYY-MM-DD
  window: { from: string; to: string };   // drawn hollow and dashed
  basis: 'history' | 'stated';
  cycles_used: number;
  confidence: 'low' | 'medium' | 'high';
}
```

---

## 7. Screens (Expo Router, web)

| Route | Screen | Requirements |
| --- | --- | --- |
| `/setup` | First open | FR-1 |
| `/` | Tell Liora: text box, mic, status chips (offline, AI on/off) | FR-2, FR-3, FR-13 |
| `/result/[id]` | Go-now, follow-up, or calm, plus source card and drawer | FR-4, FR-5, FR-7, FR-8, FR-12 |
| `/card/[id]` | Nurse card | FR-6 |
| `/log` | My log | FR-9, FR-13 |
| `/calendar` | Cycle calendar, day detail, next-period prediction | FR-17, FR-18 |
| `/mood` | Mood check and crisis screen | FR-10 |
| `/checklist` | AI-off checklist | FR-11 |
| `/scan` | Photo of check-up record (stretch) | FR-14 |
| `/dev/eval` | Eval runner and measurements (not linked in the UI) | section 15 |

Copy on the input prompt, follow-up, go-now, nurse card and crisis screens is Filipino with English
underneath. Everything else is English.

---

## 8. Decision model

Pure functions in `src/core/rules/`:

```ts
evaluate(findings: Finding[], context: Context): Decision
```

- A **rule** is `{ id, codes, when?: (ctx) => boolean, minSeverity?, level: 'go_now', source: SourceRef }`.
- **Order:** collect rules whose codes are present; if a matching rule needs severity and the
  finding is `unknown`, return `follow_up` (one question at a time); otherwise `go_now` with all
  fired rules; else `ok`.
- **Context:** `status` selects pregnancy or postpartum rule sets. DT.17 (BP 160/110 or more with
  proteinuria) only evaluates when both BP and proteinuria are present.
- **Follow-up questions** are a fixed table `{ question_id, code, fil, en }`. Yes upgrades
  severity to `severe`; no sets `mild`; skip sets `severe`.
- **Mood check** (`src/core/epds/`): `score(answers) → { total, selfHarm }`, `selfHarm = answers[9] > 0`.
  Cut-off 13, the cut-off used in the 2026 Philippine BMJ Open study.

### Cycle prediction (`src/core/cycle/`)

A second deterministic model, also pure functions with tests. The algorithm is a **recency-weighted
median** of her recent cycle lengths (each older cycle weighs 0.85 of the next), with cycles that hold
a forgotten period left out, a range-based window and a rule-based confidence label (switched from a
simple moving average on 2026-10-10; see "Why the weighted median" below). Its only data is her own confirmed dates; there is no population dataset and no training.
It is **not** the calendar / rhythm method, which estimates fertile days for contraception; Liora
does not do that.

```ts
predictNext(periods: PeriodRecord[], settings: CycleSettings, today: string): Prediction | null
```

```
starts  = confirmed period start dates, oldest first
lengths = days between each start and the next
lengths = keep only 15..90                      # drop missed logs
lengths = drop forgotten periods                # near 2x, 3x her median while the rest are steady
recent  = last 12 of lengths, newest first

if len(recent) >= 2:
    L      = round(weighted_median(recent, decay = 0.85))
    near   = first 6 of recent
    spread = max(near) - min(near)
    half   = max(2, ceil(spread / 2))
    basis  = 'history'
    confidence = 'high'   if len(recent) >= 3 and spread <= 7
                 'medium' if len(recent) >= 3
                 'low'    otherwise
elif settings.stated_cycle_length:
    L = stated_cycle_length; half = 3; basis = 'stated'; confidence = 'low'
else:
    return null                                 # "Log two periods and Liora will estimate the next one"

next_start = last(starts) + L
window     = next_start - half .. next_start + half
```

**Worked example (use it as a unit test):** starts Jul 1, Jul 29, Aug 27, Sep 24 give
lengths 28, 29, 28; weighted median 28; next start
Sep 24 + 28 = Oct 22; spread 1, so half = max(2, 1) = 2; window Oct 20 to Oct 24; 3 cycles with
spread ≤ 7, so `high`. Irregular lengths 26, 35, 30 give L = 30, spread 9, half 5, `medium`.

**Why the weighted median (2026-10-10, user's call after a comparison):** on seeded simulated
histories (800 women per scenario; simulated, never quoted as results) the mean and the weighted
median were within a tenth of a day on tidy logs, but with 15% of periods unlogged the mean was off
by about 4.6 days against 1.5 for the weighted median with forgotten periods left out, and one
unusually long cycle moved the mean by about 0.6 days more. Forgotten-period rule: a cycle at least
1.6 times the median of her other cycles and within 0.2 of a whole multiple, when those others are
steady (1.4826 x MAD / median <= 0.15); basis: Li, Urteaga et al., JAMIA 2022, on skipped logging.

- **Cycle lengths** are the day gaps between consecutive confirmed period starts. Gaps outside
  15 to 90 days are treated as missing logs, not cycles (a data-sanity bound, not a medical one).
- **Basis:** `history` when at least 2 cycle lengths exist (recency-weighted median of the last up
  to 12, rounded to the nearest whole day); otherwise
  `stated` when she gave a usual cycle length; otherwise no prediction ("Log two periods and Liora
  will estimate the next one").
- **Next start** = last confirmed start + the (rounded) cycle length.
- **Window:** next start ± ceil(spread / 2) days, where spread = longest minus shortest of the
  latest 6 lengths used; never narrower than ±2 days. With `stated` basis the window is ±3 days.
- **Demo data:** a fresh install has no history. For the demo, log past periods through Tell
  Liora or the calendar on the demo phones; if seeded dates are used, label them as sample data.
- **Confidence** (a display heuristic, not a medical threshold, and labelled as such in the
  drawer): `low` for `stated` or 2 cycles; `medium` for 3 or more cycles with spread over 7 days;
  `high` for 3 or more cycles with spread of 7 days or less.
- **Period length** for drawing predicted days: mean of logged period lengths, else the stated
  period length, else 5.
- **Never** predicts while `status` is `pregnant` or `postpartum`, and never shows fertile or
  ovulation days.
- Period entries from Tell Liora resolve to a date (`today`, `yesterday`, `days_ago`, or an explicit
  date) and are only written to `PeriodRecord` after she confirms the date chip ("Started Oct 8,
  tama ba?"). `unknown` asks her to pick the day on the calendar.

### Sources (no rule or card ships without one)

| Source | Use | Status |
| --- | --- | --- |
| WHO ANC Digital Adaptation Kit (2021), ANC.DT.01; SMART ANC repo `ANCDT01.cql` | 13 danger signs, urgent referral | Verified |
| WHO ANC DAK, ANC.DT.17 | BP 160/110 or more with proteinuria | Verified |
| DOH Mother and Child Book | Mother-facing warning signs, pregnancy and postpartum; source cards | Task R2: transcribe with page refs |
| WHO PCPNC (Pregnancy, Childbirth, Postpartum and Newborn Care) | Self-recognisable danger signs; normal changes; source cards | Task R2 |
| Cox, Holden & Sagovsky (1987), EPDS | Mood check items and scoring | Task R3: items verbatim, cited |
| National crisis hotline | Crisis screen number | Task R3: confirm from the official source |

ANC.DT.01 was written for health workers. `looks_very_ill`, `unconscious` and `central_cyanosis`
are phrased for a companion ("if she cannot be woken", "if her lips turn blue") and live on the
checklist. Fixed copy never names a condition, never guesses a cause, never says "you are fine".

---

## 9. Retrieval: source cards with local embeddings

### Cards

`src/content/cards.ts` (or `content/cards.json`), 30 to 50 entries:

```ts
interface SourceCard {
  id: string;
  title_en: string;
  title_fil?: string;
  body: string;                     // verbatim excerpt, short
  source: { org: 'WHO' | 'DOH'; title: string; year: number; ref: string; url: string };
  stage: 'pregnancy' | 'postpartum' | 'any';
  codes: string[];                  // related danger or symptom codes
  rule_ids: string[];               // rules this card explains (FR-8 direct link)
}
```

### Index

- `scripts/embed-cards.ts` runs in Node at build time with the same model and settings as the
  phone, and writes `public/index/cards.json` (card IDs plus vectors).
- The same script embeds **symptom prototypes**: 5 to 10 Taglish and English phrasings per danger
  code (for example `severe_headache`: "sobrang sakit ng ulo", "parang binibiyak ang ulo"), written
  by the team as inputs, never as advice.

### Runtime

- `ml-worker` embeds the message (and its clauses split on `,`, `tapos`, `at`, `and`, `.`).
- **Embedding matcher (safety):** any clause with cosine similarity of at least τ_sym to a danger
  prototype adds that code with severity `unknown`, which triggers the fixed follow-up. It can only
  add findings.
- **Card retrieval (explanation):** top 3 cards by cosine filtered by stage; show the top card if
  at least τ_card, else "Ask at your check-up".
- τ_sym and τ_card are tuned on the eval set (section 15) and recorded in the README.

### Embedding model (chosen in S1)

| Model | Download (HF file sizes) | Notes |
| --- | --- | --- |
| `onnx-community/embeddinggemma-2-ONNX` | text model q4f16 ~157 MB; vision encoder q4f16 ~98 MB, loaded only for FR-14 | **Default (v4).** EmbeddingGemma 2, Apache-2.0: text, images, video and audio in one 768-d space, 100+ languages, Matryoshka truncation to 128, 256 or 512. Use the model card's query and document prompts. |
| `Xenova/multilingual-e5-small` | ~118 MB (int8) | Fallback if EmbeddingGemma 2 is too slow or large on the iPhones. Text only. Needs `query: ` and `passage: ` prefixes. |

**Multimodal scope.** Cards and symptom prototypes are text. Images enter the same space only from
the FR-14 check-up record (so a record photo can retrieve the matching card) and from illustrated
DOH pages if task R2 transcribes them with page references. A photo of her body is never embedded
(SR-12). The audio encoder is not loaded: speech goes through transcription so she can edit it.
Rejected: `jinaai/jina-clip-v2` (CC BY-NC 4.0, ~861 MB).

---

## 10. Tech stack

### Core stack

| Layer | Package | Version |
| --- | --- | --- |
| Framework | `expo` (web export) | ~57.0.21 |
| Routing | `expo-router` | ~57.0.20 |
| UI runtime | `react`, `react-dom`, `react-native`, `react-native-web` | 19.2.3, 19.2.3, 0.86.3, ~0.21.2 |
| Language | `typescript` | ~6.0.3 (the version Expo SDK 57 expects) |
| Styling | `nativewind`, `tailwindcss` | ^4.2.0 (not v5), ^3.4.16 |
| Motion | `react-native-reanimated`, `react-native-worklets` | ~4.5.1, ~0.10.1 |
| Graphics | `react-native-svg` | ~15.15.4 |
| Layout | `react-native-safe-area-context`, `react-native-screens` | ~5.7.0, ~4.26.2 |
| State | `zustand` | ^5.0.0 |
| Schemas | `zod` | ^4.1.0 |
| Dates | `date-fns` | ^4.1.0 |
| Fonts | `expo-font`, `@expo-google-fonts/marcellus` | ~57.0.3, ^0.4.1 |
| Package manager | pnpm | 9.x |

Install Expo packages with `pnpm expo install` so versions stay SDK-aligned.

### New for this app

| Layer | Package | Version | Purpose |
| --- | --- | --- | --- |
| Model runtime | `@huggingface/transformers` | 4.3.1 | Gemma 4 E2B (typed decisions, speech, stretch vision) in `ai-worker`; EmbeddingGemma 2 and the fallbacks in `ml-worker`; WebGPU with WASM fallback. `gemma4`, `embedding_gemma2` and `modernbert` are in the 4.3.1 release (2026-10-07). |
| Fallback text runtime | `@mlc-ai/web-llm` | 0.2.85 | Only if Gemma 4 E2B cannot run on the iPhones: `gemma3-1b-it-q4f16_1-MLC`, typed decisions read from token logprobs. WebLLM has no Gemma 4 build. |
| Worker bundling | `esbuild` | latest 0.x | Bundles both workers into `public/`, outside Metro |
| Storage | `idb-keyval` | latest | IndexedDB (MMKV is native-only) |
| Offline | `workbox-cli` | latest | Service worker over the exported web build |
| Tests | `vitest` | ^4.1 | `src/core/` unit tests |
| Hosting | GitHub Pages via GitHub Actions | | HTTPS |

### Model registry

| Role | Model | Download (Hugging Face file sizes) | Loaded when |
| --- | --- | --- | --- |
| Text understanding and typed decisions | `onnx-community/gemma-4-E2B-it-ONNX` (Gemma 4 E2B, Apache-2.0; 2.3B effective parameters; text, image and audio in) | text-only: decoder q4f16 ~1,520 MB plus token embeddings q4f16 ~1,591 MB (~3.1 GB); int8 embeddings are ~3.2 GB in three shards (~4.7 GB total) | Setup; kept resident |
| Speech recognition | Gemma 4 E2B audio encoder. Fallback `onnx-community/whisper-base` | q4f16 ~172 MB / Whisper decoder ~54 MB int8 plus encoder | On mic tap; released after |
| Embeddings (multimodal) | `onnx-community/embeddinggemma-2-ONNX`. Fallback `Xenova/multilingual-e5-small` | ~157 MB text; ~98 MB vision for FR-14 | On submit; released after |
| Image reading (stretch) | Gemma 4 E2B vision encoder. Fallback `onnx-community/Florence-2-base-ft` | q4f16 ~99 MB | On scan; released after |
| Typed decisions, fallback | `convaiinnovations/laya-multilingual` (Laya, Apache-2.0, 322M, mmBERT), exported with `laya-ts/scripts/export_onnx.py` | ~644 MB safetensors before export and quantisation | Only if Gemma 4 E2B cannot load |

**If Gemma 4 E2B does not fit Safari's memory:** `onnx-community/gemma-4-E2B-it-qat-mobile-ONNX`
(2-bit decoder ~995 MB plus embeddings ~1,297 MB, ~2.3 GB), then WebLLM `gemma3-1b-it-q4f16_1-MLC` (~711 MB
GPU estimate), then Laya-multilingual, then the AI-off checklist. All sizes are Hugging Face file
sizes or vendor estimates, not measurements. Real numbers come from S1 and section 15.

### Not used, and why

| Piece | Reason |
| --- | --- |
| Express backend, Prisma, BullMQ, Redis | No server |
| Supabase | No accounts or cloud storage |
| agent-service (FastAPI, LangGraph, OpenRouter) | Cloud AI is against the theme |
| TanStack Query | No server to query |
| MMKV, secure-store, local-authentication, notifications, haptics, glass-effect, `@expo/ui` | Native-only |
| Sentry | Sends data off the device |
| RevenueCat | No payments |
| react-hook-form | Forms are one field or one tap per screen |

---

## 11. Design system: Capiz Light

- **Colours (light / dark):** `tint #C2255C / #FF7BA7`, `tint-soft #FBE4EE / #3A1728`,
  `urgent #C8102E / #FF6B63`, `ground #F2ECF1 / #0F0A0E`, `surface #FEFBFD / #1D1519`,
  `surface-raised #FFFFFF / #271D23`, `label #241A21 / #F8EEF3`,
  `label-secondary #675663 / #B6A5B0`, `separator #E4D7E0 / #33262E`, `dusk #743C62 / #C99AB4`,
  `fertile #127A66 / #52C9A8`.
- **Type:** Marcellus for wordmark and screen titles only; system font (SF Pro on iPhone) for the
  rest at Apple's iOS text sizes: body 17/22, headline 17/22 semibold, title1 28/34 bold, title3 20/25
  semibold, footnote 13/18.
- **Radii:** sm 10, pane 22, sheet 28, capsule 25. **Spacing:** 4, 8, 12, 16, 20, 24, 32.
- **Calendar:** a day is drawn solid when logged and hollow and dashed when predicted (DESIGN.md).
  Period uses `tint`; dots for symptoms and moods use `label-secondary` and `dusk`.
- **Rules:** light and dark are equals; only the urgent screen shouts; one entrance per screen;
  Reduce Motion honoured; colour is never the only signal.
- **Banned:** sparkle glints, glow orbs, aurora backgrounds, numbered eyebrows, identical icon
  cards, fade-up on everything, stock wellness copy ("sanctuary", "journey").
- **iPhone web:** `viewport-fit=cover`, `env(safe-area-inset-*)`, web manifest and Apple touch
  icon for Add to Home Screen.

---

## 12. Safety and privacy requirements

| ID | Requirement |
| --- | --- |
| SR-8 | Liora does not diagnose, prescribe or guarantee outcomes. Every screen footer: "Liora doesn't diagnose. It helps you decide when to go." |
| SR-9 | No medical claim without a cited source card. |
| SR-10 | No analytics, no error-reporting service, no network after setup (NFR-2). |
| SR-11 | Audio and photos are processed in memory and discarded. Only the transcript or confirmed values are saved. |
| SR-12 | No photo-based diagnosis and no medicine advice (out of scope, section 3). |
| SR-13 | Test fixtures describe symptoms only; they never contain advice. |

---

## 13. Workers and runtime details

- **`ai-worker`** (`workers/ai-worker.ts` → `public/workers/ai-worker.js`): Transformers.js with
  Gemma 4 E2B on `device: 'webgpu'` (WASM fallback). Messages:
  `{ type: 'decide', text: string, questions: TypedQuestion[] } | { type: 'transcribe', audio: Float32Array } | { type: 'read', image: Blob } | { type: 'release' }`.
  `decide` runs her message once as a cached prefix, then scores each question's options from the
  next-token logits (no sampling, no free text). Answers are validated with Zod. Timeout 8 s for
  the whole question set (tune in S1).
- **Typed-question prompt:** a short instruction ("Answer with one of the listed options only. Do
  not give advice."), 4 to 6 Taglish few-shot pairs if they raise eval scores, her message, then
  the question and its lettered options.
- **`ml-worker`** (`workers/ml-worker.ts` → `public/workers/ml-worker.js`): Transformers.js
  pipelines on `device: 'webgpu'` with WASM fallback, for EmbeddingGemma 2 and the fallbacks
  (Whisper base, multilingual-e5-small, Florence-2, Laya). Messages:
  `{ type: 'embed', texts: string[] } | { type: 'embed-image', image: Blob } | { type: 'transcribe', audio: Float32Array } | { type: 'release', role }`.
- **Audio capture:** `MediaRecorder` (Safari records `audio/mp4`), max 30 s, decode with
  `AudioContext.decodeAudioData`, resample to 16 kHz mono with `OfflineAudioContext`, transfer the
  `Float32Array` to the worker. Whisper `language`: `tagalog` or auto-detect, whichever scores
  better on the eval set.
- **Model caching:** Transformers.js caches weights in browser storage. Setup (FR-1) pre-fetches
  Gemma 4 E2B (decoder, token embeddings, audio encoder) and EmbeddingGemma 2's text model, so
  text and voice work offline. Fallback models are fetched only if they are needed.
- **Expo web config:** `web.output: 'single'`, `experiments.baseUrl: '/liora-local'`.
- **Service worker:** Workbox `generateSW` over `dist/` after `expo export -p web`, precaching the
  shell, workers, cards index and fonts.

## 14. Offline verification (S1 and again before the demo)

1. Open the Pages URL online, finish setup, use voice once.
2. Close Safari completely, enable airplane mode, reopen: text, voice, cards and mood check work.
3. Repeat inside the Home Screen web app (it has its own storage, so setup must run inside it
   once).

## 15. Testing, evaluation and measurement

- **Unit tests (Vitest):** vocabulary, lexicon, merge, rules (a firing and a non-firing test per
  rule), follow-ups, EPDS scoring and self-harm short-circuit, cosine and threshold logic, cycle
  prediction (no history, stated only, 2 cycles, steady and wide history, pregnant status, date
  resolution of `days_ago` and explicit dates).
- **Eval set (`eval/cases.json`):** at least 30 typed Taglish cases (danger, calm, vague, period,
  mood, near-misses like "medyo" vs "sobrang") with expected codes; 10 spoken clips recorded by the
  team for the same cases.
- **`/dev/eval` page** runs the set on the device and reports: per-code recall and precision per
  source (lexicon, embedding, LLM, merged), word error rate for voice, card retrieval hit rate,
  and timings.
- **Measured on both iPhones:** download sizes, cold and warm load times, LLM time to first token
  and tokens per second, end-to-end time per message, transcription time for a 10 s clip, peak
  stability (no tab reloads).
- **Typed-decision calibration:** on the eval set, record each danger question's probability, then
  set τ_lo and τ_hi so the merged pipeline misses no danger case, accepting more follow-up
  questions. Report per-source recall and calibration error. Never quote Jev's, Laya's or any
  vendor's benchmarks as ours.
- **Only measured numbers** go in the README and pitch.
- **Before each deploy:** `pnpm test`, `pnpm typecheck`, `expo export -p web` succeed.

## 16. Repo layout

```
liora-local/
├── app/                       # Expo Router screens
├── src/
│   ├── core/                  # vocabulary, lexicon, merge, rules, followups, epds, cycle, similarity (no React)
│   ├── content/               # source cards, follow-up copy, fixed screen copy
│   ├── ai/                    # page-side clients for ai-worker and ml-worker, schemas, prompt
│   ├── audio/                 # recording and resampling
│   ├── store/                 # zustand + idb-keyval
│   └── ui/                    # components, motifs, tokens
├── workers/                   # ai-worker.ts, ml-worker.ts (esbuild → public/workers/)
├── scripts/embed-cards.ts     # build-time card and prototype embeddings
├── public/                    # manifest, icons, workers, index/cards.json
├── eval/                      # cases.json, audio clips
├── docs/superpowers/specs/    # this file
├── .github/workflows/pages.yml
└── README.md                  # submission README with disclosures
```

## 17. Build order and timeline (Asia/Manila)

| Time | Task | Exit criteria |
| --- | --- | --- |
| 5:45 to 7:00 PM (slipped) | **S1 spike:** scaffold Expo web app, both workers, Pages deploy. On both iPhones: load Gemma 4 E2B (q4f16, then the 2-bit qat-mobile build) and EmbeddingGemma 2's text model, plus Whisper base only if Gemma's speech is poor; run 5 cases, including the three demo phrases, as typed decisions; check offline reload. | Text model, speech path and embedding model recorded; Gemma 4 and the embedding model coexist without a tab reload, or the fallback chain is taken. |
| 7:00 to 10:00 PM | **R1 to R3:** vocabulary, lexicon, merge, rules with sources, follow-ups, EPDS, cycle prediction (TDD); typed decisions wired. | Unit tests green; text pipeline returns correct decisions for the eval danger cases. |
| 10:00 PM to 12:00 AM | **Voice** (FR-3) and **source cards + embedding matcher** (FR-8). | Spoken danger case reaches go-now offline; calm case shows a cited card. |
| 12:00 to 3:30 AM | **Screens:** setup, Tell Liora, result, nurse card, log, **calendar with prediction** (FR-17, FR-18; `src/core/cycle/` written TDD in the 7 to 10 PM block), mood, checklist. | All must-have flows click through on iPhone; a typed period entry lands on the calendar. |
| 3:30 to 4:30 AM | Offline service worker, drawer (FR-12), design polish, dark mode. | Section 14 passes on both iPhones. |
| 4:30 to 6:00 AM | Eval and measurements on both iPhones; fixes. | Numbers recorded in README. |
| 6:00 to 7:00 AM | **Stretch** FR-14 photo scan, only if everything above is green. | Confirmed values appear on the nurse card. |
| 7:00 to 9:30 AM | README, 1-minute video, X/LinkedIn post (tag Devin/Cognition, #AppBuildersPH), rehearsal. | Submission form drafted. |
| 10:00 AM | Submit on Cerebral Valley. Code freeze. | — |

**Cut order if late:** FR-14 photo, then FR-15/16, then dark-mode polish, then FR-18 prediction
(keep the FR-17 calendar of logged days), then FR-3 voice, then FR-8 retrieval (keep the direct
rule-to-card link). **Never cut:** FR-2, FR-4, FR-5, FR-6, FR-11.

## 18. Submission disclosures (draft)

- **Models:** Gemma 4 E2B (`onnx-community/gemma-4-E2B-it-ONNX`) or the fallback actually shipped;
  EmbeddingGemma 2 (`onnx-community/embeddinggemma-2-ONNX`); Whisper base, Laya-multilingual or
  Florence-2 only if used. All run on-device.
- **Methods credited:** Jev-style typed decisions follow TypeSafe AI's public description of Jev and
  the open SemIf method (MIT). No TypeSafe code or service is used. Laya's browser runner
  (Apache-2.0) is disclosed if it is vendored.
- **Technologies:** section 10.
- **APIs and cloud services:** none at runtime. First load downloads the app from GitHub Pages and
  model weights from Hugging Face and GitHub.
- **Runs locally:** speech recognition, multimodal embeddings and retrieval, Jev-style typed
  decisions, image reading, the rule-based decision model, mood check, storage.
- **Requires internet:** first download only.
- **Existing code and assets:** no existing code; every source file is written during the
  hackathon. WHO and DOH passages and the EPDS, cited.
- **AI development tools:** Claude Code (Anthropic).
- **Why local:** works with no signal or load; her words never leave the phone; answers in
  seconds; no per-question cost, so it can stay free.

## 19. Risks and fallbacks

| Risk | Fallback |
| --- | --- |
| Gemma 4 E2B does not fit Safari's memory on iOS 27.2, or crashes the tab | Take the fallback chain in section 10 (2-bit build, then Gemma 3 1B on WebLLM, then Laya). If none works, demo the model on the laptop and the phone in AI-off mode, and say so. |
| Typed decisions are poorly calibrated in Taglish | Thresholds biased to caution; uncertain danger answers ask the follow-up; the word list and embedding matcher still count; the checklist path stays. |
| Too many models for Safari's memory | Release after use (NFR-5); Gemma 4 handles speech so Whisper stays unloaded; skip the embedding matcher and keep card retrieval. |
| Speech misreads Taglish | Editable transcript (FR-3); compare Gemma 4 audio with Whisper base on the 10 spoken eval clips and keep the better one. |
| Metro cannot bundle part of the app for web | Workers already sit outside Metro. Otherwise fall back to a Vite + React shell using the same `src/core/`. |
| WHO or DOH sources not obtainable in time | Ship only verified DT.01 rules and the cards we could cite; never invent. |
| Cache lost before the demo | Re-run setup over a hotspot; keep a recorded backup video. |

## 20. After the hackathon

`src/core/`, `src/content/` and the eval set are plain TypeScript and data, so they can move into a
native app unchanged, with the workers replaced by native on-device runtimes (Gemma 4 through
LiteRT-LM or llama.rn, or Apple's Foundation Models). Source-card licences (WHO content is
commonly CC BY-NC-SA) need review before commercial use.
