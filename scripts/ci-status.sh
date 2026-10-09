#!/usr/bin/env bash
# Short status of new commits and CI runs, so the devops watcher spends tokens only on problems.
# Usage: scripts/ci-status.sh [--peek]   (--peek leaves the "last checked" marker alone)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

peek=0
[ "${1:-}" = "--peek" ] && peek=1
marker="$(git rev-parse --git-dir)/ci-status-last"
last=$(cat "$marker" 2>/dev/null || true)

if [ -n "$last" ] && git cat-file -e "$last^{commit}" 2>/dev/null; then
  range="$last..HEAD"
elif git rev-parse -q --verify HEAD~5 >/dev/null; then
  range="HEAD~5..HEAD"
else
  range="HEAD"
fi

flags=()
commits=()
while read -r sha; do
  [ -z "$sha" ] && continue
  s=${sha:0:7}
  subj=$(git log -1 --format=%s "$sha")
  commits+=("$s $subj")
  if ! out=$(bash .githooks/commit-msg <(git log -1 --format=%B "$sha") 2>&1); then
    flags+=("$s ${out%%$'\n'*}")
  fi

  files=$(git diff-tree --no-commit-id --name-only -r "$sha")
  while read -r f; do
    [ -z "$f" ] && continue
    size=$(git cat-file -s "$sha:$f" 2>/dev/null || echo 0)
    [ "$size" -gt 5000000 ] && flags+=("$s adds $f ($((size / 1000000)) MB)")
  done <<<"$files"

  if git show "$sha" --format= -U0 | grep -E '^\+' \
    | grep -qE 'hf_[A-Za-z0-9]{30,}|ghp_[A-Za-z0-9]{30,}|github_pat_|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY'; then
    flags+=("$s may contain a secret (check the diff, do not print it)")
  fi
  if grep -qE '^src/core/.*\.ts$' <<<"$(grep -vE '\.test\.ts$' <<<"$files")" \
    && ! grep -qE '^src/core/.*\.test\.ts$' <<<"$files"; then
    flags+=("$s changes src/core without a test change (TDD rule)")
  fi
  if grep -qx 'package.json' <<<"$files"; then
    added=$(git show "$sha" --format= -U0 -- package.json | grep -E '^\+')
    grep -q '"react-native-css-interop"' <<<"$added" && flags+=("$s adds react-native-css-interop (banned)")
    grep -qE '"nativewind": *"[~^]?5' <<<"$added" && flags+=("$s moves NativeWind to v5 (pinned to 4.2)")
  fi
  grep -qE '^\.claude/skills/|^\.claude/agents/impeccable-' <<<"$files" \
    && flags+=("$s commits third-party skill or agent files")
done < <(git rev-list --reverse "$range")

ci="CI: no GitHub remote yet"
if command -v gh >/dev/null && git remote get-url origin 2>/dev/null | grep -q github.com; then
  runs=$(gh run list --limit 3 --json databaseId,name,status,conclusion,headSha \
    -q '.[] | "\(.databaseId) \(.name) \(.status) \(.conclusion) \(.headSha[0:7])"' 2>/dev/null)
  if [ -z "$runs" ]; then
    ci="CI: no runs yet"
  else
    ci="CI: $(head -1 <<<"$runs" | awk '{print $2, $3, $4, "on", $5}')"
    while read -r id name status conclusion sha; do
      case "$conclusion" in failure | cancelled | timed_out | startup_failure)
        flags+=("run $id ($name) $conclusion on $sha") ;;
      esac
    done <<<"$runs"
  fi
fi

summary="${#commits[@]} new commit(s); $ci"
if [ ${#flags[@]} -eq 0 ]; then
  echo "STATUS: OK - $summary"
else
  echo "STATUS: FLAGS (${#flags[@]}) - $summary"
  printf -- '- %s\n' "${flags[@]}"
fi
n=${#commits[@]}
[ "$n" -gt 0 ] && printf '  %s\n' "${commits[@]:$((n > 10 ? n - 10 : 0))}"

[ "$peek" -eq 0 ] && git rev-parse HEAD >"$marker"
exit 0
