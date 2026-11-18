#!/usr/bin/env bash
# Read-only: is the instance this run started worth driving? Changes nothing.
set -uo pipefail
source "$(dirname "$0")/common.sh"
fail=0
ok() { echo "ok    $1"; }
bad() { echo "FAIL  $1"; fail=1; }

if [ ! -f "$RUN_DIR/server.pid" ]; then
  bad "no instance recorded in $RUN_DIR (run launch.sh)"
  exit 1
fi
PID="$(cat "$RUN_DIR/server.pid")"
PORT="$(cat "$RUN_DIR/port")"
ARK="$(cat "$RUN_DIR/ark-server")"

if same_server "$PID"; then ok "server process $PID is running"; else bad "server process $PID is gone, or the pid was reused (see $RUN_DIR/server.log)"; fi

# The port must be held by the process this run started, not by someone else's server.
owner=""
if command -v ss >/dev/null 2>&1; then
  owner="$(ss -ltnpH "sport = :$PORT" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)"
elif command -v lsof >/dev/null 2>&1; then
  owner="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)"
fi
if [ "$owner" = "$PID" ]; then ok "port $PORT is owned by this run"; else bad "port $PORT is owned by pid '${owner:-none}', not $PID"; fi

if curl -fsS "http://localhost:$PORT/" 2>/dev/null | grep -q '<div id="root"'; then ok "app shell is served"; else bad "app shell is not served on $PORT"; fi

# The build being served is this checkout's HEAD.
head_commit="$(git -C "$ROOT" rev-parse --short=8 HEAD 2>/dev/null)"
served="$(curl -fsS "http://localhost:$PORT/src/_gitCommit.ts" 2>/dev/null | grep -o "gitCommit = ['\"][0-9a-f]*" | grep -o "[0-9a-f]\{7,\}" | head -1)"
if [ -n "$served" ] && [ "$served" = "$head_commit" ]; then
  ok "serving commit $served"
else
  bad "serving commit '${served:-unknown}' but HEAD is $head_commit (relaunch to pick it up)"
fi
if [ -n "$(git -C "$ROOT" status --porcelain 2>/dev/null)" ]; then echo "note  the working tree has uncommitted changes; they are being served too"; fi

# There is no login. The wallet needs its Arkade server to create or load a wallet.
code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$ARK/v1/info" 2>/dev/null)"
if [ "$code" = "200" ]; then ok "Arkade server answers ($ARK)"; else bad "Arkade server $ARK returned ${code:-nothing}; onboarding will stop on its unreachable-server error"; fi

exit $fail
