#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS="$DIR/scripts"

# shellcheck source=scripts/maestro-config.sh
source "$SCRIPTS/maestro-config.sh"
CONFIG="$(require_maestro_config "$DIR")"
export_maestro_env "$CONFIG"
require_wallet_url "$WALLET_URL"

python3 "$SCRIPTS/sync-secret-subflows.py"

# shellcheck source=scripts/maestro-device.sh
source "$SCRIPTS/maestro-device.sh"
DEVICE="$(require_android_device)"

echo "Studio — device=$DEVICE"
echo "WALLET_URL=$WALLET_URL"
echo "WALLET_NSEC=$(if [[ -n "$WALLET_NSEC" ]]; then echo set; else echo MISSING; fi)"
echo "WALLET_PASSWORD=$(if [[ -n "$WALLET_PASSWORD" ]]; then echo set; else echo empty; fi)"
echo "Env via MAESTRO_* (Studio does not accept -e / --config on the studio subcommand)."
cd "$DIR"
exec maestro -p android --device "$DEVICE" studio
