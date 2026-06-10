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
  echo "  then set env.WALLET_URL (and WALLET_NSEC / WALLET_PASSWORD as needed)" >&2
  exit 1
}

read_config_env() {
  local config="$1" key="$2"
  sed -n "s/^  ${key}: *\"\\(.*\\)\".*/\\1/p" "$config" | head -1
}

read_wallet_url() {
  read_config_env "$1" WALLET_URL
}

# Print maestro -e KEY=VALUE pairs (one pair per two lines) for "$(maestro_env_args ...)".
maestro_env_args() {
  local config="$1"
  local url password nsec
  url="$(read_config_env "$config" WALLET_URL)"
  password="$(read_config_env "$config" WALLET_PASSWORD)"
  nsec="$(read_config_env "$config" WALLET_NSEC)"

  printf '%s\n' "-e" "WALLET_URL=${url}"
  printf '%s\n' "-e" "WALLET_PASSWORD=${password}"
  printf '%s\n' "-e" "WALLET_NSEC=${nsec}"
}

export_maestro_env() {
  local config="$1"
  export WALLET_URL="$(read_config_env "$config" WALLET_URL)"
  export WALLET_PASSWORD="$(read_config_env "$config" WALLET_PASSWORD)"
  export WALLET_NSEC="$(read_config_env "$config" WALLET_NSEC)"
}

require_wallet_url() {
  local url="$1"
  if [[ -z "${url}" || "$url" == "https://your-preview-or-production-wallet-url" ]]; then
    echo "error: set a real WALLET_URL in maestro/config.yaml" >&2
    exit 1
  fi
}

require_wallet_nsec() {
  local nsec="$1"
  if [[ -z "${nsec}" || "$nsec" == "nsec1your-test-restore-key-here" ]]; then
    echo "error: set WALLET_NSEC in maestro/config.yaml (throwaway test key, never funded)" >&2
    exit 1
  fi
}

require_wallet_password() {
  local password="$1"
  if [[ -z "${password}" ]]; then
    echo "error: set WALLET_PASSWORD in maestro/config.yaml (needed for unlock / lock tests)" >&2
    exit 1
  fi
}
