#!/usr/bin/env bash
# Shared paths for the verify-arkade-wallet helpers. Sourced, never run.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
VERIFY_DIR="$ROOT/.verify/arkade-wallet"
RUN_DIR="$VERIFY_DIR/run"           # scratch: pid, port, logs, browser profile. Removed by cleanup.
EVIDENCE_DIR="$VERIFY_DIR/evidence" # proof: screenshots and step logs. Never removed by cleanup.
PORT="${VERIFY_PORT:-3102}"
