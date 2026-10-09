#!/usr/bin/env bash
# Downloads the cited source documents into sources/raw/ (gitignored) and extracts per-page text.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
mkdir -p sources/raw sources/text
node -e 'for (const s of require("./sources/manifest.json").sources) console.log(s.file, s.url)' |
  while read -r file url; do
    [ -s "sources/raw/$file" ] || curl -sSfL --max-time 120 -o "sources/raw/$file" "$url"
    echo "downloaded $file ($(du -k "sources/raw/$file" | cut -f1) KB)"
    if [[ "$file" == *.pdf ]]; then
      id="${file%.pdf}"; mkdir -p "sources/text/$id"
      pages=$(pdfinfo "sources/raw/$file" | awk '/^Pages:/{print $2}')
      for ((p = 1; p <= pages; p++)); do
        pdftotext -layout -f "$p" -l "$p" "sources/raw/$file" "sources/text/$id/page-$(printf %03d "$p").txt"
      done
      echo "  extracted $pages pages to sources/text/$id/"
    fi
  done
