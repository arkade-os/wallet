#!/usr/bin/env bash
# Start one wallet dev server for this run and wait until the app is usable.
#   VERIFY_PORT       port to serve on (default 3102, so it never collides with a human's 3002)
#   VITE_ARK_SERVER   Arkade server the wallet talks to (default: public mutinynet test server)
set -euo pipefail
source "$(dirname "$0")/common.sh"
export VITE_ARK_SERVER="${VITE_ARK_SERVER:-https://mutinynet.arkade.sh}"

mkdir -p "$RUN_DIR" "$EVIDENCE_DIR"
if [ -f "$RUN_DIR/server.pid" ] && kill -0 "$(cat "$RUN_DIR/server.pid")" 2>/dev/null; then
  echo "launch: an instance from an earlier run is still up (pid $(cat "$RUN_DIR/server.pid")). Run cleanup.sh first." >&2
  exit 1
fi
# Refuse to share a port with anything this run did not start.
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  echo "launch: port $PORT is already in use by a process this run did not start. Set VERIFY_PORT to a free port." >&2
  exit 1
fi

cd "$ROOT"
pnpm git-info > "$RUN_DIR/prepare.log" 2>&1
pnpm build:worker >> "$RUN_DIR/prepare.log" 2>&1

# vite is started directly so the recorded pid is the server itself, not a wrapper shell.
nohup node node_modules/vite/bin/vite.js --port "$PORT" --strictPort > "$RUN_DIR/server.log" 2>&1 &
echo $! > "$RUN_DIR/server.pid"
echo "$PORT" > "$RUN_DIR/port"
echo "$VITE_ARK_SERVER" > "$RUN_DIR/ark-server"

# Ready means usable: the shell is served AND its entry module compiles.
for _ in $(seq 1 90); do
  if ! kill -0 "$(cat "$RUN_DIR/server.pid")" 2>/dev/null; then
    echo "launch: the dev server exited. Last lines of $RUN_DIR/server.log:" >&2
    tail -n 20 "$RUN_DIR/server.log" >&2
    exit 1
  fi
  if curl -fsS "http://localhost:$PORT/" 2>/dev/null | grep -q '<div id="root"' &&
    curl -fsS -o /dev/null "http://localhost:$PORT/src/index.tsx" 2>/dev/null; then
    echo "launch: ready on http://localhost:$PORT (pid $(cat "$RUN_DIR/server.pid"), server $VITE_ARK_SERVER)"
    exit 0
  fi
  sleep 1
done
echo "launch: not ready after 90s. See $RUN_DIR/server.log" >&2
exit 1
