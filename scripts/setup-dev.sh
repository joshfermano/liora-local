#!/usr/bin/env bash
# One-time setup for a fresh clone: the commit-message hook, the third-party skills listed in
# skills-lock.json (installed for Claude Code), and impeccable's helper agents. Our own subagents
# are already in git.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

git config core.hooksPath .githooks
echo "commit-msg hook enabled (.githooks/commit-msg)"

node -e 'const s = require("./skills-lock.json").skills;
  for (const [name, v] of Object.entries(s)) console.log(v.source, name);' |
  while read -r source name; do
    npx -y skills add "$source" -s "$name" -a claude-code --copy -y >/dev/null </dev/null
    echo "skill installed: $name"
  done
git checkout -- skills-lock.json 2>/dev/null || true

npx -y impeccable update >/dev/null </dev/null
chmod +x .claude/skills/impeccable/scripts/impeccable
echo "impeccable updated, with its helper agents in .claude/agents/impeccable-*"

echo "done: $(ls .claude/skills | wc -l) skills, $(ls .claude/agents | wc -l) agents"
