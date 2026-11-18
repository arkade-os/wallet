#!/usr/bin/env bash
# Shared paths for the verify-arkade-wallet helpers. Sourced, never run.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
VERIFY_DIR="$ROOT/.verify/arkade-wallet"
RUN_DIR="$VERIFY_DIR/run"           # scratch: pid, port, logs, browser profile. Removed by cleanup.
EVIDENCE_DIR="$VERIFY_DIR/evidence" # proof: screenshots and step logs. Never removed by cleanup.
PORT="${VERIFY_PORT:-3102}"

# A pid alone is not an identity: once the server exits, the system can hand the same number to
# an unrelated process. launch.sh records when the server started, and everything that reads or
# signals the pid checks that the process with that number is still the one that was started.
proc_started() { LC_ALL=C ps -p "$1" -o lstart= 2>/dev/null | tr -s ' ' | sed 's/^ //;s/ $//'; }
same_server() {
  local pid="$1" recorded
  [ -n "$pid" ] && [ -f "$RUN_DIR/server.start" ] || return 1
  recorded="$(cat "$RUN_DIR/server.start")"
  [ -n "$recorded" ] && [ "$(proc_started "$pid")" = "$recorded" ] || return 1
  ps -p "$pid" -o args= 2>/dev/null | grep -q "vite.js --port $PORT"
}
