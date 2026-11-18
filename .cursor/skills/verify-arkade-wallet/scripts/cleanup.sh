#!/usr/bin/env bash
# Stop the instance this run started and remove its scratch state. Evidence is kept.
set -uo pipefail
source "$(dirname "$0")/common.sh"

if [ -f "$RUN_DIR/server.pid" ]; then
  PID="$(cat "$RUN_DIR/server.pid")"
  # Only ever the recorded pid, and only while it is still the server launch.sh started. That is
  # checked again before every signal, because the number can be reused the moment the server exits.
  if same_server "$PID"; then
    kill "$PID" 2>/dev/null
    for _ in $(seq 1 20); do same_server "$PID" || break; sleep 0.25; done
    if same_server "$PID"; then kill -9 "$PID" 2>/dev/null; fi
    echo "cleanup: stopped server $PID"
  else
    echo "cleanup: server $PID is not running, or that pid now belongs to something else; nothing signalled"
  fi
fi

# The browser profile holds the throwaway wallet's key. It goes with the run.
rm -rf "$RUN_DIR"
echo "cleanup: removed $RUN_DIR"
echo "cleanup: evidence kept in $EVIDENCE_DIR"
ls -1 "$EVIDENCE_DIR" 2>/dev/null | tail -n 5
