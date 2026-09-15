#!/usr/bin/env bash
# Idempotent dependency bootstrap for the Arkade Wallet Cloud Agent environment.
set -eo pipefail

cd "$(dirname "$0")/.."

# The repo pins Node 24.15.0 (.nvmrc / package.json engines). The base image
# ships nvm, so activate the pinned version rather than the image's default node.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install >/dev/null   # reads .nvmrc (24.15.0); no-op if already installed
nvm use >/dev/null
node -v

# pnpm is pinned via package.json "packageManager"; corepack provides it.
corepack enable
corepack pnpm install --frozen-lockfile

# Generate src/_gitCommit.ts (git-ignored) which the app and unit tests import.
corepack pnpm git-info
