---
description: Cheap check of new commits and CI; wakes the devops-engineer agent only when something is flagged. Run on a timer with /loop 15m /ci-watch
---

Run `bash scripts/ci-status.sh` and read its output.

- If the first line starts with `STATUS: OK`, reply with that line only. Do nothing else.
- If it starts with `STATUS: FLAGS`, use the devops-engineer agent. Give it only the flagged lines,
  and ask for the cause and the smallest fix in at most 150 words. Relay its answer in at most five
  lines.

Never push, re-run a deploy or change repository settings from this command.
