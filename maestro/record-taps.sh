#!/usr/bin/env bash
# Record manual taps on the connected Android device (coordinates + timings).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RECORDINGS="$DIR/recordings"
mkdir -p "$RECORDINGS"

DEVICE="${ADB_DEVICE:-$(adb devices | awk 'NR>1 && $2=="device" { print $1; exit }')}"
if [[ -z "${DEVICE}" ]]; then
  echo "error: no adb device connected" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
RAW="$RECORDINGS/raw-${STAMP}.log"
SUMMARY="$RECORDINGS/taps-${STAMP}.txt"

WM="$(adb -s "$DEVICE" shell wm size 2>/dev/null | tr -d '\r' | awk '{print $NF}')"
W="${WM%x*}"
H="${WM#*x}"

echo "Device: ${DEVICE}"
echo "Screen: ${W} x ${H}"
echo "Raw log: ${RAW}"
echo ""
echo ">>> Tap on the phone. Press Ctrl+C when finished. <<<"
echo ""

cleanup() {
  echo ""
  echo "Parsing…"
  python3 "$DIR/scripts/parse-taps.py" "$RAW" "$W" "$H" >"$SUMMARY"
  echo "Summary: ${SUMMARY}"
  cat "$SUMMARY"
}

trap cleanup INT TERM

adb -s "$DEVICE" shell getevent -lt 2>&1 | tee "$RAW"
