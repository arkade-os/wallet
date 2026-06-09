#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS="$DIR/scripts"

# shellcheck source=scripts/maestro-config.sh
source "$SCRIPTS/maestro-config.sh"
CONFIG="$(require_maestro_config "$DIR")"
WALLET_URL="$(read_wallet_url "$CONFIG")"

if [[ -z "${WALLET_URL}" || "$WALLET_URL" == "https://your-preview-or-production-wallet-url" ]]; then
  echo "error: set a real WALLET_URL in maestro/config.yaml" >&2
  exit 1
fi

export WALLET_URL

# shellcheck source=scripts/maestro-device.sh
source "$SCRIPTS/maestro-device.sh"
DEVICE="$(require_android_device)"

echo "Running on $DEVICE — WALLET_URL=$WALLET_URL"
cd "$DIR"
exec maestro test -p android --device "$DEVICE" --config "$CONFIG" -e "WALLET_URL=$WALLET_URL" "$@"
