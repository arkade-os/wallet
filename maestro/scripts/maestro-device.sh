#!/usr/bin/env bash
# Shared Android device selection for Maestro CLI (physical device, not desktop Chromium).
set -euo pipefail

resolve_android_device() {
  if [[ -n "${ADB_DEVICE:-}" ]]; then
    echo "$ADB_DEVICE"
    return
  fi
  adb devices 2>/dev/null | awk 'NR>1 && $2=="device" { print $1; exit }'
}

require_android_device() {
  local device
  device="$(resolve_android_device)"
  if [[ -z "$device" ]]; then
    echo "error: no adb device connected (adb devices)" >&2
    exit 1
  fi
  echo "$device"
}
