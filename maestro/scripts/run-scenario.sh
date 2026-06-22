#!/usr/bin/env bash
# Run a Maestro E2E scenario and produce a Markdown report.
# Usage: ./maestro/scripts/run-scenario.sh <scenario> [extra-flow-or-number]
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS="$DIR/scripts"
# Complete Tests suite (formerly testOLD)
COMPLETE_TESTS="complete-tests"
COMPLETE_FLOWS="$COMPLETE_TESTS/flows"
REPORTS="$DIR/reports"
SCENARIO="${1:?usage: run-scenario.sh <scenario> [single-target]}"
EXTRA="${2:-}"

# shellcheck source=maestro-config.sh
source "$SCRIPTS/maestro-config.sh"
CONFIG="$(require_maestro_config "$DIR")"
export_maestro_env "$CONFIG"
require_wallet_url "$WALLET_URL"

case "$SCENARIO" in
  onboarding|reset-restore|reset_restore|prerelease|pre-release)
    require_wallet_nsec "$WALLET_NSEC"
    ;;
esac
case "$SCENARIO" in
  unlock|prerelease|pre-release)
    require_wallet_password "$WALLET_PASSWORD"
    ;;
esac

python3 "$SCRIPTS/sync-secret-subflows.py"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEBUG_DIR="$DIR/debug/${SCENARIO}-${TIMESTAMP}"
JUNIT="$REPORTS/${SCENARIO}-${TIMESTAMP}.junit.xml"
REPORT="$REPORTS/${SCENARIO}-${TIMESTAMP}.md"
LATEST="$REPORTS/latest-${SCENARIO}.md"

mkdir -p "$REPORTS" "$DEBUG_DIR"

mapfile -t FLOWS < <(
  case "$SCENARIO" in
    smoke)
      printf '%s\n' "$COMPLETE_FLOWS/_run_all_smoke.yaml"
      ;;
    onboarding)
      printf '%s\n' "$COMPLETE_FLOWS/01_fresh_wallet.yaml" "$COMPLETE_FLOWS/02_startup_restore.yaml"
      ;;
    reset-restore|reset_restore)
      printf '%s\n' "$COMPLETE_FLOWS/_run_reset_then_create.yaml"
      ;;
    unlock)
      printf '%s\n' "$COMPLETE_FLOWS/13_unlock_wallet.yaml"
      ;;
    settings)
      printf '%s\n' "$COMPLETE_FLOWS/08_home_open_settings.yaml" "$COMPLETE_FLOWS/15_settings_deep_reset_wallet.yaml"
      ;;
    prerelease|pre-release)
      printf '%s\n' "$COMPLETE_FLOWS/_run_all_smoke.yaml" "$COMPLETE_FLOWS/_run_reset_then_create.yaml"
      ;;
    single)
      if [[ -z "$EXTRA" ]]; then
        echo "error: single scenario requires flow name or number (e.g. 09 or 09_home_tabs)" >&2
        exit 1
      fi
      if [[ "$EXTRA" =~ ^[0-9]+$ ]]; then
        match="$(find "$DIR/$COMPLETE_FLOWS" -maxdepth 1 -name "${EXTRA}_*.yaml" ! -name '_*' | head -1)"
        if [[ -z "$match" ]]; then
          echo "error: no flow found for number $EXTRA" >&2
          exit 1
        fi
        rel="${match#"$DIR/"}"
        printf '%s\n' "$rel"
      elif [[ -f "$DIR/$EXTRA" ]]; then
        printf '%s\n' "$EXTRA"
      elif [[ -f "$DIR/$COMPLETE_FLOWS/$EXTRA" ]]; then
        printf '%s\n' "$COMPLETE_FLOWS/$EXTRA"
      elif [[ -f "$DIR/$COMPLETE_FLOWS/${EXTRA}.yaml" ]]; then
        printf '%s\n' "$COMPLETE_FLOWS/${EXTRA}.yaml"
      else
        echo "error: flow not found: $EXTRA" >&2
        exit 1
      fi
      ;;
    *)
      echo "error: unknown scenario: $SCENARIO" >&2
      echo "valid: smoke, onboarding, reset-restore, unlock, settings, prerelease, single" >&2
      exit 1
      ;;
  esac
)

# shellcheck source=maestro-device.sh
source "$SCRIPTS/maestro-device.sh"
DEVICE="$(require_android_device)"

echo "Scenario: $SCENARIO"
echo "Flows: ${FLOWS[*]}"
echo "Device: $DEVICE (Android Chrome — open WALLET_URL in Chrome first)"
echo "WALLET_URL: $WALLET_URL"
echo "Debug: $DEBUG_DIR"
echo "Report: $REPORT"
echo ""

START_EPOCH="$(date +%s)"
set +e
cd "$DIR"
mapfile -t MAESTRO_ENV < <(maestro_env_args "$CONFIG")
maestro test \
  -p android \
  --device "$DEVICE" \
  --config "$CONFIG" \
  "${MAESTRO_ENV[@]}" \
  --format JUNIT \
  --output "$JUNIT" \
  --debug-output "$DEBUG_DIR" \
  --flatten-debug-output \
  "${FLOWS[@]}"
MAESTRO_EXIT=$?
set -e
END_EPOCH="$(date +%s)"
DURATION="$((END_EPOCH - START_EPOCH))"

python3 "$SCRIPTS/build-report.py" \
  --scenario "$SCENARIO" \
  --junit "$JUNIT" \
  --debug-dir "$DEBUG_DIR" \
  --wallet-url "$WALLET_URL" \
  --device "${DEVICE:-unknown}" \
  --flows "${FLOWS[@]}" \
  --duration "$DURATION" \
  --maestro-exit "$MAESTRO_EXIT" \
  --output "$REPORT"

ln -sf "$(basename "$REPORT")" "$LATEST"
echo "$REPORT" > "$REPORTS/.last-report-path"

"$SCRIPTS/open-report.sh" "$REPORT"

exit "$MAESTRO_EXIT"
