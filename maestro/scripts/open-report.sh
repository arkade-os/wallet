#!/usr/bin/env bash
# Open a Markdown report in Apostrophe (or fallback editor).
set -euo pipefail

REPORT="${1:?usage: open-report.sh <report.md>}"
REPORT="$(readlink -f "$REPORT")"

if [[ ! -f "$REPORT" ]]; then
  echo "error: report not found: $REPORT" >&2
  exit 1
fi

opened=0

if command -v apostrophe >/dev/null 2>&1; then
  apostrophe "$REPORT" &
  opened=1
fi

for desktop in apostrophe.desktop org.gnome.Apostrophe.desktop com.github.alecaddd.apostrophe.desktop; do
  if [[ $opened -eq 0 ]] && command -v gtk-launch >/dev/null 2>&1; then
    if gtk-launch "$desktop" "$REPORT" 2>/dev/null; then
      opened=1
      break
    fi
  fi
done

if [[ $opened -eq 0 ]] && command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$REPORT" >/dev/null 2>&1 &
  opened=1
fi

echo "Report: $REPORT"
if [[ $opened -eq 0 ]]; then
  echo "Could not launch Apostrophe; open the path above manually."
fi
