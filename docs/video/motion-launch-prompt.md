# Prompt: Tell Liora 30-second motion launch film (motion-graphics / HyperFrames)

Paste everything below the line after `/motion-graphics` in Claude Code.

---

<inputs>
Ask me for: the product name, the exact phrases she types or says, the song (royalty-free, around 130 BPM with a clear drop, Mixkit, free for commercial use) and the brand mark. If I skip anything, use the defaults: product "Tell Liora"; the phrases in the structure below; Mixkit "Cat Walk"; the brand mark at `assets/images/icon.svg` (a lit capiz window). No photos: every card is drawn in the app's own style.
</inputs>

<truth>
Tell Liora is a native iPhone app. Its AI (Gemma 4 E2B, with EmbeddingGemma 300M for sources) runs fully offline on the phone; rules written from WHO guidance decide, never the AI. The film shows stylised recreations of real Tell Liora screens, so every word on screen must be text the app really shows. The WHO lines stay word for word: "Go to the hospital or health centre immediately", "Day or night, DO NOT wait." and "Go to the health centre as soon as possible". No invented numbers, no WHO or Apple logos, and a generic iPhone-style frame (no Apple logo).
</truth>

<direction>
A 30-second product launch film, 1920x1080 at 60fps. 2D only, one continuous take. No fades, blurs or cuts: each scene grows from the last. Text rises from a mask line, buttons expand into pages, and colour floods from one object before shrinking into another. Give the camera one eased move per scene, and never zoom in and out consecutively.

Look (the app's "Capiz Light" design): Pearl Ground canvas (#f2ecf1), Night Window UI and night scenes (#1d1519), ink (#241a21), Deep Peony accent and send button (#c2255c), Rose Wash (#fbe4ee), Lit Shell glow (#fbcfa8), Hardwood frame (#5e4036), Mulberry for moods (#743c62). Alarm Red (#c8102e) appears only in the go-now flood and card. Around the composer, an Apple Intelligence-style glow made of capiz light: a blurred conic gradient rotating through peony, lit shell, rose wash, mulberry and pearl. Use Geist for UI and Marcellus for the product name and titles. Status bar with the airplane-mode icon throughout.

Banned: crossfades, blur-ins, 3D, particles, camera moves that reverse direction, holds longer than 1s, anything that feels like a template.
</direction>

<structure>
130 BPM, 64 beats (29.5s). Start the song 12 beats before its drop, which lands on beat 32.

Beats 0-2, unlock: a Face ID glyph traces and checks; the phone opens on the Liora tab.

Beats 2-8, speak (AI voice): push slowly into the glowing Liora Live orb, about 3x zoom. A waveform pulses with her voice, and the words type out over three fixed lines:
"Niregla ako today,
medyo malakas,
tapos may cramps ako"

Beat 8, save (AI agent): a peony ripple turns the words into her chat bubble, and a "Saved" card pops: "Period started · Heavy flow · Cramps" with "Undo". Pull back once to reveal the phone (402x874 screen, 11px bezel, Dynamic Island).

Beats 8-14, her cycle: the Saved card grows into the Calendar. Five logged days fill solid peony one per half-beat, the next period draws as a dashed ring, and a soft band marks the estimated fertile window labelled "An estimate, not contraception."

Beats 14-18, her mood: she types "masaya at kalmado ako ngayon"; mood chips "Joyful" and "Calm" light in mulberry, and Liora's bubble warms to a bright, upbeat line.

Beats 18-22, her profile: the mood chip becomes the Profile row; a native wheel picker spins to "Pregnant · Week 32" beside her blood type and emergency contact "Josh". A mask line raises "Months later".

Beats 22-26, not every symptom is an emergency: she types "nilalagnat ako". A question card asks "Are you too weak to get out of bed?"; the cursor taps "No" and a Rose Wash card rises: "Go to the health centre as soon as possible", with a small "WHO" source line.

Beats 26-32, 2 AM: the canvas sinks to Night Window and the status bar reads 2:00. She types over three fixed lines:
"sobrang sakit ng ulo ko
tapos malabo
ang paningin ko"
She sends; the send button grows into a capiz window (arched Hardwood frame, nine panes), and its panes light Lit Shell on beats 28, 29, 30 and 31 beneath the shimmering text "Reading on your phone…" and a chip "Gemma 4 · offline".

Beat 32, the drop: Alarm Red floods from the lit window to fill the frame in about 0.35s. Dark cards (330x440, radius 28) burst from the centre: "Her words" (her quote), "Severe headache", "Blurred vision", "WHO danger signs" and "Go now". Slide the strip across three cards and land on "Go now", which lifts with a "WHO rule" pill.

Beats 36-44, it does not let go: the red contracts into the go-now card in her thread, carrying "Go now" into its headline: "Go to the hospital or health centre immediately" and "Day or night, DO NOT wait.", with pills "Call Josh" and "Text Josh". She types "Kaya ko pa naman"; the card pulses back in with "What you told me still needs care now".

Beats 44-52, the nurse report and its sources: the cursor taps "Show the nurse". The card unfolds into the report (her name and blood type, her words, the signs, the WHO rule with its citation, the last 7 days). A share sheet slides up and "PDF" checks. A "Sources" chip opens the list of WHO and DOH documents with "word for word" beneath.

Beats 52-64, outro: the "Sources" pill expands into the page, staying pill-shaped as it reaches the edges while the camera pushes into it. Bring in "No signal at 2 AM." and "Still, she knows when to go." word by word (92px, pearl on Night Window). Four chips rise in a row: "Fully offline", "Gemma 4 on-device", "WHO sources, word for word", "Private, with Face ID". A Lit Shell dot travels the window's lattice, lighting each pane; the window becomes the brand mark, and the wordmark wipes out from behind it, with "Runs on Gemma 4, on device" above and "Tell Liora" below in Marcellus.
</structure>

<build>
1. One HTML file, 1920x1080. Compute every style from time inside seek(t): no CSS transitions, timers or state carried between frames.
2. Use one camera transform on a container, keyed by [time, zoom, x, y] with eased segments and zoom interpolated in log space.
3. Use closed-form step-response springs for every pop and settle.
4. Make every handoff a shared element: the Saved card carries into the Calendar, the mood chip into the Profile row, the red flood carries "Go now" into the card, and the Sources pill carries its label into the page.
5. Sound: a downloaded Mixkit SFX for each event: Face ID tick, voice blip, send pop, day fills, picker clicks, each pane light, drop impact, card swoosh, tap, share swoosh, success tone, page-fill whoosh and mark sparkle. Place each by its measured peak and loudnorm to -14 LUFS.
6. Render with Playwright at 60fps using 8 subframes per frame, blended with ffmpeg tmix. Review every fast moment frame by frame and scan the full video for single-frame pops.
</build>

<gotchas>
Four subframes leave ghost copies on fast moves, so render 8 and slow the move down. The red flood must reach the farthest corner and take about 0.35s, or it looks like a flash; it is the only red in the film. Set z-index on every layer so the cards don't float above the flood. Keep every typed phrase on fixed lines so the camera never has to follow a wrapping cursor. Keep each scene under the 1s hold limit even with 13 beats of features. Declare every variable before the first seek() call.
</gotchas>

<start>
Ask me for the inputs, then show me the beat map and 4 stills (speak, cycle, drop, outro) before writing the full film.
</start>
