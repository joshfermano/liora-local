# AGENTS.md: liora-local (Tell Liora)

Instructions for every coding agent working in this repo (Claude Code, Codex, Cursor, Devin and
others). Claude Code reads this file through `CLAUDE.md`, which imports it and adds Claude-only
notes (skills, subagents, hooks).

Hackathon build for **AppBuildersPH Hackathon 2026** (theme: Local AI). Code freeze **10:00 AM,
10 Oct 2026, Asia/Manila**. One submission. Repo must be public by then.

## Start here

1. Read `HANDOFF.md`: current status, decisions already made, what is pending, next step.
2. The build spec is `docs/superpowers/specs/2026-10-09-tell-liora-design.md`. It is the source of
   truth. Requirements have IDs (`FR-`, `NFR-`, `SR-`).
3. Verified research and facts allowed in the pitch: `docs/research-summary.md`.
4. Product context and design system: `PRODUCT.md` and `DESIGN.md` (Capiz Light).
5. Demo script, judge Q&A and the 10 AM checklist: `HANDOFF.md` section 10.

Do not re-open decisions recorded in `HANDOFF.md` unless the user asks.

## Setup, once per clone

Run `bash scripts/setup-dev.sh`. It turns on the commit-message hook and installs the third-party
skills from `skills-lock.json` (with impeccable's helper agents) for Claude Code. Our own subagents
in `.claude/agents/` and the slash commands in `.claude/commands/` come with the clone.

## What it is

A web app (Expo exported for web, opened in Safari on iPhone) that helps a pregnant or new mother
decide whether a symptom means "go to the hospital now" or "this can wait". She types or speaks
Taglish. On-device Gemma 4 turns her words into Jev-style typed decisions (symptom codes, each with
a confidence). A deterministic decision model from WHO and DOH sources decides. Cited source cards,
found with EmbeddingGemma 2, explain. A cycle calendar shows her logged periods and an explained
next-period estimate. Everything runs on the device.

## Hard rules

- **The AI never decides and never writes medical text.** Decisions come from `src/core/rules/`.
  Go-now and crisis screens use fixed copy. Source cards are shown verbatim. Approved by the user
  (2026-10-10): on calm turns Liora is an agent and Gemma writes its one reply from the facts the
  tools produced; every sentence must pass `guardReply` in `src/core/agent` (no medical advice,
  diagnosis, medicine or contraception advice, and no number missing from the facts) or a fixed
  `reply.*` line is shown. Never on go-now or follow-up turns; health facts come only from cards.
- **No made-up medical content**, including fixtures and placeholder copy.
- **Every number in the README or pitch is measured on the demo iPhones.** Fake benchmarks
  disqualify the team.
- **All code is written fresh, in this repo, during the hackathon.** Never copy code from another
  project or repo.
- **Verify on the real device:** the iPhone 17 Pro (iOS 27.2, the native app) is the demo phone and
  the only phone for measured numbers (team decision, 2026-10-10). Ivan develops on his iPhone 17.
  Desktop Chrome is a convenience, not evidence for iPhone.
- **Ask before outward actions:** creating or publishing a repo, enabling Pages, posting anything.
  Pushing verified commits to `main` is pre-approved by the user (2026-10-09).

## Build conventions

- pnpm only. `.npmrc` has `node-linker=hoisted`.
- NativeWind **4.2** (not v5), Tailwind 3.4. Never add `react-native-css-interop` to
  `package.json`. Never use function-form `style={({ pressed }) => ...}`.
- Install Expo packages with `pnpm expo install`. A package with native code (an Expo module,
  anything with an `ios/` folder) needs a native rebuild of every installed phone build: add a
  `Needs-native-rebuild: yes` footer to that commit so whoever builds the phones knows.
- Models run in Web Workers bundled by esbuild into `public/workers/`, outside Metro.
- TDD for `src/core/`. Vitest.
- Before claiming done: `pnpm test`, `pnpm typecheck`, `npx expo export -p web` all pass.
- Default to no comments; only a non-obvious why.
- When an installed library's API disagrees with docs or this file, trust `node_modules`.

## Testing on the iPhones

- **Quick loop:** `pnpm build:workers`, then `pnpm expo start --tunnel`. It gives an
  `https://…exp.direct` address with live reload that Safari accepts for WebGPU and the microphone.
  In development the app and its public files are served from the root (for example `/dev/workers`),
  not under `/liora-local`. The laptop must stay awake and online.
- **Release check:** the GitHub Pages build, served under `/liora-local/`. Offline mode, the Home
  Screen web app and every measured number count only there.

## Commits: Conventional Commits

Every commit follows [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<scope>): <subject>

<body: why the change was made, wrapped at 72 characters>

<footers, optional>
```

- **type:** `feat` (a user-facing feature), `fix` (a bug fix), `docs`, `style` (formatting only),
  `refactor`, `perf`, `test`, `build` (dependencies, bundling, Expo config), `ci` (GitHub Actions,
  Pages), `chore` (tooling and housekeeping), `revert`.
- **scope** (optional, lowercase): `core`, `rules`, `cycle`, `epds`, `ai`, `workers`, `ui`, `app`,
  `content`, `store`, `eval`, `pwa`, `deps`, `agents`, `spec`, `docs`.
- **subject:** imperative and lowercase, with no full stop. The whole first line stays under 70
  characters.
- **body:** why, not what; the diff already shows what.
- **breaking change:** `!` after the type or scope, plus a `BREAKING CHANGE:` footer.
- **One logical change per commit.** Commit often; the commit watcher reads every commit.
- **No AI assistant as a co-author.** No `Co-Authored-By:` trailer naming an AI tool or bot
  (Claude, Copilot, ChatGPT, Gemini, Cursor, Devin, Codex and the like), no "Generated with" lines,
  no session links. Human teammates may be co-authors. AI development tools are disclosed once, in
  the README, as the hackathon requires.
- **Enforced** by `.githooks/commit-msg` (turned on by `scripts/setup-dev.sh`) and checked again
  by `scripts/ci-status.sh`. Commits made before the evening of 2026-10-09 use
  the older `add ...` style; leave them as they are.

Examples:

```
feat(rules): add ANC.DT.01 danger-sign rules with sources
fix(workers): release the audio encoder after transcription
docs(spec): record the gemma 4 fallback chain
ci: deploy the web export to github pages
```

## Tickets (Linear)

All work is tracked in Linear: team **Lumosyn Labs** (`LUM`), project **liora-local-hackathon**,
milestones M1 to M7 matching the build plan. The build tickets are LUM-44 to LUM-78.

- **Before starting work,** find its ticket and move it to **In Progress**. New work gets a new
  ticket in the right milestone first; never work untracked, never duplicate a ticket.
- **Name the ticket in the commit** as a footer: `Refs: LUM-57`, or `Fixes: LUM-57` on the commit
  that completes it. The commit watcher flags `feat` and `fix` commits without one.
- **When it is finished,** check every acceptance criterion, then comment what shipped, the checks
  run with their results, and anything unmet. Move it to **Done**, or to **In Review** when it
  carries the `needs-iphone` label (a person must confirm it on both iPhones first).
- **When blocked,** comment why and add the blocking ticket; do not leave it silently In Progress.
- **Check progress** at the start of every session and after each milestone (`/tickets` in Claude
  Code). In Claude Code the main session updates tickets; subagents report back to it.

## Developer-specific instructions

Read `.tmp/EXTRAS.md` for local, developer-specific instructions when that file exists. Keep
machine-specific or private guidance there (it is gitignored) rather than in this shared file.

## Working with this user

- Explain in plain language. Avoid jargon or define it in a few words. The user asked twice for
  simpler explanations.
- Use subagents sparingly: token cost matters. Prefer the main session; brief any subagent
  compactly.
- Give a recommendation, not a survey of options.
