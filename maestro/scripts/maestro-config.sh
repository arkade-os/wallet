#!/usr/bin/env bash
# Resolve local Maestro config (gitignored config.yaml from config.yaml.example).
set -euo pipefail

require_maestro_config() {
  local dir="$1"
  if [[ -f "$dir/config.yaml" ]]; then
    echo "$dir/config.yaml"
    return
  fi
  echo "error: missing maestro/config.yaml" >&2
  echo "  cp maestro/config.yaml.example maestro/config.yaml" >&2
  echo "  then set env.WALLET_URL" >&2
  exit 1
}

read_wallet_url() {
  local config="$1"
  sed -n 's/^  WALLET_URL: *"\(.*\)".*/\1/p' "$config" | head -1
}
