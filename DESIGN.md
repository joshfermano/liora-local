---
name: Tell Liora
description: Know when to go, even with no signal and no one watching.
colors:
  tint: '#C2255C'
  tint-dark: '#FF7BA7'
  tint-fill: '#C2255C'
  on-tint: '#FFFFFF'
  tint-soft: '#FBE4EE'
  tint-soft-dark: '#3A1728'
  tint-soft-ink: '#A11E4E'
  tint-soft-ink-dark: '#FFB4CC'
  urgent: '#C8102E'
  urgent-dark: '#FF6B63'
  urgent-fill: '#C8102E'
  on-urgent: '#FFFFFF'
  dusk: '#743C62'
  dusk-dark: '#C99AB4'
  ground: '#F2ECF1'
  ground-dark: '#0F0A0E'
  surface: '#FEFBFD'
  surface-dark: '#1D1519'
  surface-raised: '#FFFFFF'
  surface-raised-dark: '#271D23'
  fill: '#EEE5EC'
  fill-dark: '#2B2027'
  label: '#241A21'
  label-dark: '#F8EEF3'
  label-secondary: '#675663'
  label-secondary-dark: '#B6A5B0'
  label-tertiary: '#9A8996'
  label-tertiary-dark: '#7D6C77'
  separator: '#E4D7E0'
  separator-dark: '#33262E'
  nacre: '#D9CAD4'
  nacre-dark: '#3D2E37'
  frame: '#5E4036'
  frame-dark: '#A98A7C'
  lit: '#FBCFA8'
  lit-dark: '#FFC59A'
  light-dawn-source: '#F2CFD4'
  light-dawn-source-dark: '#5E2638'
  light-dawn-fade: '#F6DEC4'
  light-dawn-fade-dark: '#3E2616'
typography:
  wordmark:
    fontFamily: 'Marcellus'
    fontSize: '22px'
    fontWeight: 400
    lineHeight: '28px'
    letterSpacing: '0.6px'
  display-title:
    fontFamily: 'Marcellus'
    fontSize: '31px'
    fontWeight: 400
    lineHeight: '38px'
    letterSpacing: '-0.3px'
  display-heading:
    fontFamily: 'Marcellus'
    fontSize: '23px'
    fontWeight: 400
    lineHeight: '29px'
    letterSpacing: '-0.1px'
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
    fontSize: '44px'
    fontWeight: 700
    lineHeight: '48px'
    fontFeature: 'tnum'
  title1:
    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
    fontSize: '28px'
    fontWeight: 700
    lineHeight: '34px'
  title2:
    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
    fontSize: '22px'
    fontWeight: 700
    lineHeight: '28px'
  title3:
    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
    fontSize: '20px'
    fontWeight: 600
    lineHeight: '25px'
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
    fontSize: '17px'
    fontWeight: 600
    lineHeight: '22px'
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
    fontSize: '17px'
    fontWeight: 400
    lineHeight: '22px'
  subheadline:
    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
    fontSize: '15px'
    fontWeight: 400
    lineHeight: '20px'
  footnote:
    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
    fontSize: '13px'
    fontWeight: 400
    lineHeight: '18px'
  caption1:
    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
    fontSize: '12px'
    fontWeight: 400
    lineHeight: '16px'
rounded:
  mark: '3px'
  sm: '10px'
  pane: '22px'
  sheet: '28px'
  capsule: '25px'
  full: '9999px'
spacing:
  xxs: '4px'
  xs: '8px'
  sm: '12px'
  md: '16px'
  lg: '20px'
  xl: '24px'
  xxl: '32px'
  pane-margin: '16px'
  pane-margin-wide: '20px'
  content-margin: '16px'
  content-margin-wide: '20px'
components:
  button-filled:
    backgroundColor: '{colors.tint-fill}'
    textColor: '{colors.on-tint}'
    typography: '{typography.headline}'
    rounded: '{rounded.capsule}'
    height: '50px'
    padding: '8px 24px'
  button-filled-disabled:
    backgroundColor: '{colors.fill}'
    textColor: '{colors.label-tertiary}'
    typography: '{typography.headline}'
    rounded: '{rounded.capsule}'
    height: '50px'
    padding: '8px 24px'
  button-tinted:
    backgroundColor: '{colors.tint-soft}'
    textColor: '{colors.tint-soft-ink}'
    typography: '{typography.headline}'
    rounded: '{rounded.capsule}'
    height: '50px'
    padding: '8px 24px'
  button-neutral:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.label}'
    typography: '{typography.headline}'
    rounded: '{rounded.capsule}'
    height: '50px'
    padding: '8px 24px'
  button-plain:
    textColor: '{colors.tint}'
    typography: '{typography.body}'
    rounded: '{rounded.full}'
    height: '44px'
    padding: '0 8px'
  button-on-alarm:
    backgroundColor: '{colors.on-urgent}'
    textColor: '{colors.urgent-fill}'
    typography: '{typography.headline}'
    rounded: '{rounded.capsule}'
    height: '50px'
    padding: '8px 24px'
  alarm-pane:
    backgroundColor: '{colors.urgent-fill}'
    textColor: '{colors.on-urgent}'
    typography: '{typography.title1}'
    padding: '24px 20px'
  lattice:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.pane}'
  lattice-header:
    textColor: '{colors.label-secondary}'
    typography: '{typography.footnote}'
    padding: '0 16px 8px'
  lattice-footer:
    textColor: '{colors.label-secondary}'
    typography: '{typography.footnote}'
    padding: '6px 16px 0'
  choice-card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.label}'
    typography: '{typography.body}'
    rounded: '{rounded.pane}'
    height: '56px'
    padding: '12px 16px'
  choice-card-chosen:
    backgroundColor: '{colors.tint-fill}'
    textColor: '{colors.on-tint}'
    typography: '{typography.body}'
    rounded: '{rounded.pane}'
    height: '56px'
    padding: '12px 16px'
  chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.label}'
    typography: '{typography.subheadline}'
    rounded: '{rounded.full}'
    height: '44px'
    padding: '0 16px'
  chip-chosen:
    backgroundColor: '{colors.tint-soft}'
    textColor: '{colors.tint-soft-ink}'
    typography: '{typography.subheadline}'
    rounded: '{rounded.full}'
    height: '44px'
    padding: '0 16px'
  tell-field:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.label}'
    typography: '{typography.body}'
    rounded: '{rounded.pane}'
    height: '132px'
    padding: '16px'
  mic-button:
    backgroundColor: '{colors.tint-soft}'
    textColor: '{colors.tint}'
    rounded: '{rounded.full}'
    size: '56px'
  mic-button-recording:
    backgroundColor: '{colors.tint-fill}'
    textColor: '{colors.on-tint}'
    rounded: '{rounded.full}'
    size: '56px'
  status-note:
    textColor: '{colors.label-secondary}'
    typography: '{typography.footnote}'
  source-card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.label}'
    typography: '{typography.body}'
    rounded: '{rounded.pane}'
    padding: '16px'
  source-card-cite:
    textColor: '{colors.label-secondary}'
    typography: '{typography.footnote}'
  nurse-card:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.label}'
    typography: '{typography.title2}'
    padding: '24px 20px'
  nurse-card-figure:
    textColor: '{colors.label}'
    typography: '{typography.display}'
  value-row:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.label}'
    typography: '{typography.body}'
    height: '44px'
    padding: '11px 16px'
  action-row-destructive:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.urgent}'
    typography: '{typography.body}'
    height: '44px'
    padding: '6px 16px'
  inline-error:
    textColor: '{colors.urgent}'
    typography: '{typography.footnote}'
  sheet:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.sheet}'
  calendar-cell:
    height: '48px'
  cycle-day:
    textColor: '{colors.label}'
    typography: '{typography.subheadline}'
    rounded: '{rounded.full}'
    size: '32px'
  cycle-day-logged:
    backgroundColor: '{colors.tint-fill}'
    textColor: '{colors.on-tint}'
    typography: '{typography.subheadline}'
    rounded: '{rounded.full}'
    size: '32px'
  cycle-day-estimated:
    textColor: '{colors.label}'
    typography: '{typography.subheadline}'
    rounded: '{rounded.full}'
    size: '32px'
  estimate-row:
    backgroundColor: '{colors.tint-soft}'
    textColor: '{colors.tint-soft-ink}'
    typography: '{typography.headline}'
    padding: '12px 16px'
  progress-square:
    backgroundColor: '{colors.surface}'
    size: '10px'
  progress-square-lit:
    backgroundColor: '{colors.tint-fill}'
    size: '10px'
  nav-bar:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.label-secondary}'
    typography: '{typography.caption1}'
    height: '50px'
  nav-item-current:
    textColor: '{colors.tint}'
    typography: '{typography.caption1}'
  brand-lockup:
    textColor: '{colors.label}'
    typography: '{typography.wordmark}'
    height: '28px'
---

# Design System: Tell Liora

**Status, 2026-10-09:** nothing is built. Every component below is committed, not yet built.
Re-run `$impeccable document` in scan mode once the screens exist, and update this file to match
what was built.

**Not in this build:** glass bars, sheets and toasts; widgets and notifications; sign-up;
choreographed screen transitions; illustrated artwork on every screen; a season palette, because
Tell Liora shows no cycle phases and no fertile window.

## Overview

**Creative North Star: "Capiz Light"**. A capiz window is translucent, never
transparent: light comes in, and the room stays private. Tell Liora reads it at its hardest hour.
At 2 AM the phone is the one lit window in a dark house. It answers calmly and in her words, and it
shouts only when she has to go.

This is an **Operate** surface. She came to do one task (tell, then decide), so clarity, familiar
controls and the real scene outrank expression. Brand lives in precise details: the pearl panes,
the peony, the dashed estimate, the Marcellus titles.

**Key characteristics:**

- A pearl ground in light and a night-window black with a plum undertone in dark, under one static
  dawn light pooled from the top edge.
- Opaque pearl panes with a nacre edge, grouped into lattices. No shadows, no blur, no glass.
- Marcellus for the wordmark and calm screen titles only. Everything she reads, every numeral and
  every urgent line is in the system face.
- Deep Peony means "you can act on this" or "period". Alarm Red means danger, and only the "go now"
  screen lets it fill a region.
- Solid means she logged it; hollow and dashed means Liora estimates it; words say both.
- Filipino first, English underneath, on the screens that matter most at night.
- Low density: at most three content blocks in the first viewport.
- Light and dark are equals. Many of her nights will be in dark appearance.

## Colors

A pearl-and-plum neutral family, one deep peony voice for action and the period, Alarm Red for
danger alone, and Mulberry for her moods. Every colour has a light value and a `-dark` sibling in
the frontmatter; components name the light token. Ratios are WCAG 2.x, computed on these values
on 2026-10-09.

### Primary

- **Deep Peony** (tint): every interactive element (capsules, plain buttons, chevrons, the mic
  glyph, the caret) and the period. 5.50:1 on a pane in light, 7.37:1 in dark.
- **Peony Fill** (tint-fill, ink on-tint): the filled capsule, a logged day, a chosen answer, the
  recording mic, a lit progress square. Deep in both appearances, because white on the brighter
  dark tint fails. White on it is 5.66:1.
- **Rose Wash** (tint-soft, ink tint-soft-ink): a lit pane (the estimate row once ready, a chosen
  chip), tinted capsules, the resting mic button. Never the background of a whole section.

### Secondary

- **Mulberry Dusk** (dusk): the mood dot on a calendar day. A graphic colour: 7.96:1 on a pane in
  light, 7.47:1 in dark. Words naming a mood are set in label colours.

### Tertiary

- **Alarm Red** (urgent): danger signs, errors and destructive actions, only. 5.06:1 on ground in
  light. It always travels with the danger glyph and words, because red
  and pink can be confused.
- **Alarm Fill** (urgent-fill, ink on-urgent), new for Tell Liora: the "go now" screen's alarm
  pane. Deep in both appearances, like Peony Fill: white on it is 5.88:1, and white on the dark
  appearance's brighter red would be 2.79:1, which fails.

### Neutral

- **Pearl Ground** (ground) / **Night Window** in dark: the screen, under the light field. Cool and
  rose-undertoned, never cream.
- **Pearl Pane** (surface): every opaque pane, row, card and sheet. **Raised Pearl**
  (surface-raised) is for the nurse card, the highest-contrast surface in the app (Ink on it is
  16.87:1 light, 14.39:1 dark).
- **Quiet Fill** (fill): disabled capsules and unlit progress squares.
- **Ink** (label): primary text. **Slate** (label-secondary): secondary lines, citations, the
  privacy note, lattice headers and footers, the today ring, the symptom dot (6.62:1 on a pane).
  **Pewter** (label-tertiary): disabled ink and days that cannot be chosen; never text she must
  read.
- **Mullion** (separator): 1pt lines between panes. **Nacre** (nacre): a lattice's or capsule's
  outer edge.
- **Hardwood** (frame) and **Lit Shell** (lit): the Home Screen icon and favicon only.
  The icon is the lit capiz window at night: a Hardwood arched window with Lit Shell panes and one
  Peony Fill pane, flat on Night Window. Files, construction and usage: `docs/brand/app-icon.md`.

### The light field

One static radial gradient, the **dawn** light,, centred on the top edge, from light-dawn-source
to light-dawn-fade and out to the ground. It is drawn once per size and appearance and never
animated. It is the same everywhere. Secondary text sits no higher than the field's middle band.

### Named Rules

**The Meaningful Colour Rule**. Every colour means one thing, and colour is never the
only carrier. Peony means "act" or "period". Alarm Red means danger. Mulberry means mood. Hardwood
and Lit Shell belong to the icon. **Green is not used**: it is kept for a fertile window, which Tell Liora
never shows, so a calm answer is never green. The team guide's green sketch box is
placeholder.

**The Only the Alarm Shouts Rule.** Alarm Fill owns a region only on the "go now" screen. Everywhere
else Alarm Red is an ink, for an error, a destructive row or the danger glyph. The crisis screen
does not shout either (see Components).

**The One Light Rule**. The light field is the only gradient: none on text, buttons,
panes or icons, no glow, no blurred blobs, and the light never fades to lilac.

## Typography

**Display font:** Marcellus (`@expo-google-fonts/marcellus`, precached by the service worker so it
renders offline).
**Body font:** the system face (`-apple-system`, so SF Pro on the iPhones).

Two voices. Marcellus, a flared Roman face from inscriptional capitals, sets the
wordmark and the titles of calm screens. Everything she reads, every label, every numeral and every
urgent line stays in the system face at Apple's default text sizes. Numerals in data are tabular.

### Hierarchy

- **Wordmark** (Marcellus 22/28, +0.6): "Liora" in the brand lockup.
- **Display Title** (Marcellus 31/38): a calm screen's title, such as the Tell Liora prompt
  "Ano'ng nararamdaman mo?".
- **Display Heading** (Marcellus 23/29): a title inside a sheet ("How Liora decided").
- **Display** (700, 44/48, tabular): the one number that answers a screen. On the nurse card, her
  pregnancy weeks or days since birth.
- **Title 1** (700, 28/34): the Filipino headline on the alarm pane.
- **Title 2** (700, 22/28): the facts on the nurse card.
- **Title 3** (600, 20/25): a follow-up or mood-check question.
- **Headline** (600, 17/22): capsule labels, the month title, the estimate's date.
- **Body** (400, 17/22): everything she reads, including source-card passages and the English line
  under a Filipino headline.
- **Subheadline** (400, 15/20): calendar day numerals (tabular), the estimate's basis and confidence.
- **Footnote** (400, 13/18): citations, the privacy note, the disclaimer footer, lattice headers and
  footers, inline errors.
- **Caption 1** (400, 12/16): weekday initials and navigation labels. 11 is the floor.

### Named Rules

**The One Face, One Weight Rule**. Marcellus ships one weight: never bold it, never set
it below Display Heading, never set a body line, label or numeral in it.

**The Legible at 2 AM Rule.** The "go now" screen, the nurse card and the crisis screen use the
system face only. When she is scared or a nurse is reading fast, legibility beats grace.

**The Bilingual Pair Rule.** Where copy is bilingual, the Filipino line comes first in the larger
style and the English line sits directly under it, one style smaller or in Slate. They are one unit:
never split across panes, and read together by a screen reader.

**The No Label Above Rule**. Nothing sits above a heading: no eyebrow, kicker,
small-caps tag or 01/02/03 numbering.

**The Text Size Rule.** Sizes are Apple's defaults. Layouts must survive Safari's larger text
sizes and 200% zoom without clipping or overlap; rows grow and stack instead.

## Layout

Phone first, at the iPhone 17 and 17 Pro width (402pt), and the same column in a laptop browser.

- **Two margins**: panes sit at the pane margin, 16 below 414pt wide and 20
  from 414; text sits at the content margin, the same steps, never below 12.
- **Wide screens:** one centred column, at most 440 wide; the ground and light field fill the rest.
- **Safe areas:** `viewport-fit=cover` and `env(safe-area-inset-*)` on every edge.
- **Rhythm:** 4, 8, 12, 16, 20, 24, 32. 32 between a title zone and its actions, 24 between
  lattices, 12 between capsules, 8 from a lattice header to its lattice. Space above a heading is
  always larger than space below it.
- **Rows** are at least 44 tall, which is also the touch-target floor. A choice card is at least 56.
  A calendar row is 48.
- **A screen that fits never scrolls.** It scrolls only when content is taller than the frame, as
  with the keyboard up or at large text sizes.

### Named Rules

**The Three Blocks Rule**. At most three content blocks in the first viewport. Calm is a
layout decision.

**The Keyboard Rides Rule**. With the iPhone keyboard up, the text box and the
Check capsule stay visible; the focused field always wins over the button.

## Elevation & Depth

Flat. Nothing casts a shadow, nothing is blurred, and nothing is glass. Depth comes from the light
field and from opaque pearl panes with a nacre edge on the ground. Sheets (the day detail, "How
Liora decided") rise over a flat Ink scrim at about 40%, with no blur.

### Named Rules

**The Flat Content Rule**. If something must stand out, it earns it with light (a lit
pane), position and words, never a shadow.

**The No Glass Rule.** Nothing is glass. Bars and sheets are
opaque pearl with a nacre hairline.

## Shapes

- **The lattice:** one frame at radius 22 with a 1pt nacre edge; panes inside share 1pt mullions.
- **Capsules:** half the control's height (25 for a 50-tall capsule). A capsule is a control, never
  a container.
- **Circles:** calendar days, the mic button, the today ring.
- **Sheets:** radius 28 on the top corners only, meeting the bottom edge.
- **Progress squares:** 10pt squares at radius 3, sharing 1pt gaps.
- **Borders:** the nacre edge; a 1.5pt peony edge on a focused field or lit pane; a 1.5pt dashed
  peony edge on an estimated day (drawn in SVG as 16 segments at 60% dash, because a CSS dashed
  border cannot set its segments); a 1pt Slate today ring 2pt outside the day. No other lines.
- **Corners on the web** are ordinary circular corners; continuous (squircle) corners are not
  available in the browser, and that is accepted.

### Named Rules

**The No Reflow Rule**. A state that adds a stroke, mark or check reserves its room in
every state. Changing state never moves anything.

## Components

All committed, not yet built.

### Foundations

- **Text:** the only text element. It takes a hierarchy variant and a palette colour, never a raw
  size or hex.
- **PressableSurface:** every pressable is built on it, with a static style; press feedback is a
  scale and opacity dip over 140ms. Never `style={({ pressed }) => ...}`, which NativeWind drops.
- **Icons:** one closed set of SVG glyphs at one stroke weight, sized with the text beside them,
  taking a palette token: mic, stop, lock, danger, check, chevron left and right, info, close,
  phone, calendar, list. Emoji and Unicode glyphs are never icons. The icon library is chosen at
  build time; only one is used.

### Buttons

**CapsuleButton**, at least 50 tall, 24 side padding, a Headline label:

- **Filled** (Peony Fill): the screen's one commit action ("Check", "Mark period start").
- **Tinted** (Rose Wash): a secondary action that still deserves weight.
- **Neutral** (Pearl Pane with a nacre edge): a quiet alternative.
- **Plain** (peony Body text, 44 tall): "Why?", "Skip", "Ask at your check-up".
- **On alarm** (white with Alarm Fill ink, 5.88:1): only inside the alarm pane, for "Show this to
  the nurse".
- **Disabled:** Quiet Fill and Pewter, and the press goes with it.
- **Loading:** an indicator replaces the label at the same width, and the button reports busy.

### Containers and rows

- **GroupedSection (the lattice):** the only content container. A Footnote Slate header names the
  group; a Footnote Slate footer says why.
- **ChoiceCard** (a window card): one answer, one pearl card at radius 22, 8 apart in a list.
  Choosing it lights it: Peony Fill rises from the lower edge, the label turns white and a check
  settles at the trailing edge, all crossfaded over 220ms with every layer mounted. Used for
  follow-up answers, mood-check answers, setup questions and the AI-off checklist (multi-select
  there, reported as checkboxes).
- **Chip:** a 44 capsule with a nacre edge; chosen, it fills with Rose Wash and a check. Used for
  the date confirmation ("Started Oct 8, tama ba?") and small choices.
- **ValueRow:** one fact as one row: Body label, value trailing in Slate. Used in the drawer and
  setup progress.
- **ActionRow, destructive:** an Alarm Red Body label inside a lattice, for "Delete everything",
  always followed by a confirmation.
- **InlineError:** a Footnote in Alarm Red led by the danger glyph, directly under what caused it.
  The field itself does not turn red.

### Tell Liora (signature)

The home screen. The brand lockup, then the prompt as a Bilingual Pair ("Ano'ng nararamdaman mo?"
in Display Title, "How are you feeling?" in Body Slate), then:

- **TellField:** one multi-line pane at radius 22 with a nacre edge, at least four lines tall,
  growing to about eight. On focus its edge crossfades to 1.5pt peony. **No placeholder:** a
  placeholder never gives an example or an instruction.
- **MicButton:** a 56 circle beside the Check capsule. Resting, it is Rose Wash with a peony mic.
  Recording, it is Peony Fill with a white stop glyph, and the elapsed time sits beside it in words
  ("0:12 of 0:30"). **Recording never uses Alarm Red**, because red means danger here. While
  transcribing, the waiting signal shows; then the words appear in the TellField for her to edit.
- **Status line:** under the actions, in Footnote Slate with glyphs, always in words: the lock
  glyph and "Stays on this phone", plus the AI state ("AI on" or "AI off, checklist on") and
  "Offline" when it is. A coloured dot is never the whole signal.

### The "go now" screen (signature)

Fixed copy only. It appears at once, with no entrance animation.

- **The alarm pane** fills the top of the screen from the top edge, in Alarm Fill: the danger glyph,
  the Filipino headline in Title 1 white, the English line in Body white, and the "Show this to the
  nurse" capsule (on alarm). Every line on it is white; hierarchy comes from size and weight, never
  from fading the white.
- **Below, on pearl:** the sign or signs that fired, in words; the rule's source in Footnote Slate;
  and a plain "Why?" that opens the source card linked to the fired rule.

### Nurse card (signature)

One tap from the "go now" screen; full screen on Raised Pearl, the highest contrast in the app. Her
pregnancy weeks or days since birth in Display; then the reported signs with severity, the time
logged and any blood pressure she entered, each a Title 2 fact with its label as a Bilingual Pair.
No decoration, no light field, nothing a nurse has to decode.

### Follow-up question

One question per screen, as a Bilingual Pair in Title 3 and Body. Two ChoiceCards for yes and no,
and a plain "Skip". What skipping means is stated in fixed copy on the screen, because skipping
counts as serious.

### Calm answer and SourceCard (signature)

- **Calm answer:** fixed calm copy in Body, then the "go right away if you notice" list as a
  lattice, then the best-matching SourceCard, or "Ask at your check-up" when no card clears the
  threshold.
- **SourceCard:** a pearl pane holding the cited passage verbatim in Body, then the citation in
  Footnote Slate: organisation, title, year and page. **The Verbatim Rule:** the passage is never
  shortened, re-styled mid-sentence, or given assistant chrome (no avatar, no "AI says", no sparkle).
  If it is long, the card grows.

### "How Liora decided" drawer

A sheet with a Display Heading. One lattice per finder (word list, embeddings, AI, checklist), each
saying in plain words what it found (for the AI's typed decisions, with the confidence in words and
as a number); one lattice for the rules that fired, with rule IDs and
sources; one lattice of ValueRows for the model IDs and versions. Factual and uncoloured, except the
danger glyph beside a danger sign.

### Mood check and crisis screen

- **Mood check:** one EPDS item per screen as ChoiceCards, with progress squares lit up to the
  current item and read aloud as "Question 3 of 10".
- **Crisis screen:** fixed copy, the system face, short and direct, Filipino first. It does **not**
  shout: no alarm pane and no red field. Help is one tap away in a filled peony capsule that calls
  the hotline. It appears at once, with no entrance animation.

### Setup progress

"Getting Liora ready for offline". Each model is a ValueRow with its real downloaded size in words
("312 of 879 MB", from the download itself) and a row of ten progress squares lit in proportion.
Never a bare percentage, a bar or a ring.

### Cycle calendar and estimate (signature)

The certainty grammar:

- **A day** is a 32 circle with a tabular Subheadline numeral. **Logged** period days are solid
  Peony Fill with a white numeral; **estimated** days are hollow with the dashed peony edge and an
  Ink numeral; **today** carries the 1pt Slate ring; a day that cannot be chosen shows its numeral
  in Pewter.
- **Under a day,** two fixed dot slots: a Slate dot (left) when she logged a symptom and a Mulberry
  dot (right) when she logged a mood. Position, colour and the day's spoken label ("October 8,
  period day 1, logged, symptoms and mood logged") carry it together.
- **The month** has a Headline title with 44 peony chevrons and Caption 1 weekday initials; a month
  change is one 220ms crossfade.
- **Tapping a day** opens a sheet with that day's entries in words and "Mark period start" /
  "Mark period end".
- **The estimate row:** "Next period around <date>" in Headline, the basis and confidence in words
  in Subheadline, and the footer "Not for birth control." Once ready, its pane lights in Rose Wash.
  While she is pregnant or postpartum the calendar shows entries and her weeks, with no estimate.
- **Open decision:** whether the dashed days are the estimate's whole window or only the predicted
  period days. Recommended: dash the predicted period days and state the window
  in words.

### Navigation

An opaque pearl bar at the bottom with a nacre hairline and the bottom safe-area inset: Tell, Log,
Calendar and Mood, each a glyph over a Caption 1 label, the current one in peony with its label.
The "go now" screen, nurse card and crisis screen hide it.

### Waiting

A row of five progress squares lighting one after another, shown only after 300ms and looping only
while something is in progress. Never a stock spinner
on its own. Long waits say what is happening in words ("Listening", "Reading your words").

### Motion

- **Tokens:** 140ms for press and focus, 220ms for state changes and crossfades, 340ms
  for larger moves. Curves: standard `cubic-bezier(0.2, 0.7, 0.3, 1)` and arrival
  `cubic-bezier(0.16, 1, 0.3, 1)`. Springs are critically damped and never overshoot.
- **Entrance:** once per calm screen, up to three groups, 60ms apart, each rising 8pt as it fades
  in, all done within 700ms. Urgent and crisis screens have none.
- **Touch:** every pressable dips and releases: 0.97 for capsules, 0.98 for cards. Full-width
  capsules never scale on hover.
- **State:** values crossfade and never count up; a chosen card lights by crossfade.
- **Screens** change with a plain crossfade, or none.
- **Reduce Motion** makes all of it instant. Transform and opacity only; nothing loops except
  waiting.

## Do's and Don'ts

### Do:

- **Do** build from Text, PressableSurface, CapsuleButton, the lattice and ChoiceCard, using the
  tokens in this file; a screen never writes a raw hex or pixel size.
- **Do** put content in opaque pearl panes with a nacre edge, and keep the first viewport to three
  blocks.
- **Do** draw every logged fact solid and every estimate hollow and dashed, with the confidence in
  words beside it.
- **Do** set bilingual copy as a Filipino-first pair, and keep urgent screens in the system face.
- **Do** pair Alarm Red with the danger glyph and words, every time.
- **Do** show source-card passages verbatim with their citation.
- **Do** design and check light and dark in the same pass, on the real iPhones.
- **Do** keep targets at 44pt and label every control for screen readers.
- **Do** honour Reduce Motion and Safari's larger text sizes.
- **Do** write copy that is warm, plain and specific; controls name their action, and errors name
  the problem and the way out.

### Don't:

- **Don't** put AI-generated text on the "go now" screen, the crisis screen or a source card.
- **Don't** use green for a calm answer, or red for recording.
- **Don't** let an urgent or crisis screen wait for an animation.
- **Don't** use glass, blur, shadows, gradients beyond the one light field, glow orbs, sparkles or
  aurora backgrounds.
- **Don't** use cream, beige or ivory grounds, or pastel pink-and-lavender.
- **Don't** carry any state (danger, AI on or off, selection, confidence) by colour alone.
- **Don't** set Marcellus below Display Heading, bold it, or use it on urgent screens.
- **Don't** put an eyebrow, kicker or 01/02/03 numbering above a heading.
- **Don't** build card grids or identical icon cards, nest a pane in a pane, or ring a big number
  with stat tiles.
- **Don't** show a bare percentage, a progress bar or a progress ring.
- **Don't** count numbers up, bounce, confetti, or give everything the same fade-up entrance.
- **Don't** write a placeholder that gives an example, says "Required" or instructs.
- **Don't** use emoji or Unicode glyphs as icons.
- **Don't** ship the team guide's sketch copy, or any medical wording without a cited source.
- **Don't** use stock wellness copy ("sanctuary", "journey") or exclamation marks in health
  contexts.
