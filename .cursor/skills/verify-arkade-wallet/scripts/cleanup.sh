#!/usr/bin/env bash
# Stop the instance this run started and remove its scratch state. Evidence is kept.
set -uo pipefail
source "$(dirname "$0")/common.sh"

if [ -f "$RUN_DIR/server.pid" ]; then
  PID="$(cat "$RUN_DIR/server.pid")"
  # Only ever the recorded pid, and only if it is still the vite we started.
  if kill -0 "$PID" 2>/dev/null && ps -p "$PID" -o args= 2>/dev/null | grep -q "vite"; then
    kill "$PID" 2>/dev/null
    for _ in $(seq 1 20); do kill -0 "$PID" 2>/dev/null || break; sleep 0.25; done
    kill -0 "$PID" 2>/dev/null && kill -9 "$PID" 2>/dev/null
    echo "cleanup: stopped server $PID"
  else
    echo "cleanup: server $PID was not running"
  fi
fi

# The browser profile holds the throwaway wallet's key. It goes with the run.
rm -rf "$RUN_DIR"
echo "cleanup: removed $RUN_DIR"
echo "cleanup: evidence kept in $EVIDENCE_DIR"
ls -1 "$EVIDENCE_DIR" 2>/dev/null | tail -n 5
