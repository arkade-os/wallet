#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS="$DIR/scripts"

# shellcheck source=scripts/maestro-config.sh
source "$SCRIPTS/maestro-config.sh"
CONFIG="$(require_maestro_config "$DIR")"
export_maestro_env "$CONFIG"
require_wallet_url "$WALLET_URL"

# shellcheck source=scripts/maestro-device.sh
source "$SCRIPTS/maestro-device.sh"
DEVICE="$(require_android_device)"

echo "Studio — device=$DEVICE"
echo "WALLET_URL=$WALLET_URL"
echo "Flows open Arkade via openLink; use complete-tests/ or flows/ from the workspace."
cd "$DIR"
mapfile -t MAESTRO_ENV < <(maestro_env_args "$CONFIG")
exec maestro -p android --device "$DEVICE" --config "$CONFIG" "${MAESTRO_ENV[@]}" studio
