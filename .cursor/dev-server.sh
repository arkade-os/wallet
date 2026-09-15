#!/usr/bin/env bash
# Launches the Vite dev server for the Arkade Wallet (foreground / attached).
set -eo pipefail

cd "$(dirname "$0")/.."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use >/dev/null

# Default to the public mutinynet test Arkade server so the wallet works out of
# the box without a local regtest/Docker stack. Override VITE_ARK_SERVER (or run
# `pnpm regtest:start`, which requires Docker) to target a different backend.
export VITE_ARK_SERVER="${VITE_ARK_SERVER:-https://mutinynet.arkade.sh}"

exec corepack pnpm start
