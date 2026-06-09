# Arkade Wallet — Maestro E2E (Android Chrome)

End-to-end tests for the Arkade Wallet web app, run on a **physical Android device** via **Google Chrome** and [Maestro](https://maestro.mobile.dev/).

Flows use **percentage-based coordinates** recorded from real taps (not CSS selectors). They are reliable on the [reference device](#reference-device) below; other phones or navigation modes usually require re-recording.

## Prerequisites

| Tool | Notes |
|------|--------|
| [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro) | `maestro -v` |
| Android platform tools | `adb devices` shows your phone as `device` |
| Google Chrome | `com.android.chrome` on the device |
| USB debugging | Enabled; authorize the host machine |

## Quick start

1. Clone this repo and go to the repository root.

2. Create your local config (not committed):

   ```bash
   cp maestro/config.yaml.example maestro/config.yaml
   ```

   Edit `maestro/config.yaml` and set `env.WALLET_URL` to your preview or production wallet URL.

3. Connect the reference device (or re-record taps on yours — see [Reference device](#reference-device)).

4. Run a scenario from the repo root:

   ```bash
   ./maestro/scripts/run-scenario.sh onboarding
   ```

   Other scenarios: `smoke`, `reset-restore`, `unlock`, `settings`, `prerelease`, `single 09`.

5. Markdown reports are written to `maestro/reports/` (gitignored).

### Single flow

```bash
./maestro/run.sh complete-tests/flows/04_home_open_receive.yaml
```

### Maestro Studio (interactive)

```bash
./maestro/studio.sh
```

Studio uses `-p android` and your connected device. Flows open Arkade via `openLink` automatically.

## How it works

- **`appId: com.android.chrome`** — taps hit the phone, not desktop Chromium.
- **`-p android --device <serial>`** — enforced by `run.sh`, `studio.sh`, and `run-scenario.sh`.
- **`open_wallet_url` subflow** — opens `WALLET_URL` in Chrome before navigation and coordinate taps.
- **Integer percentages only** — e.g. `point: "50%, 88%"` (no decimals).
- **No `evalScript`** — coordinate taps and shared wait subflows only.

## Test suites

### Complete Tests (`complete-tests/`)

| # | Flow | Purpose |
|---|------|---------|
| 01 | `01_fresh_wallet.yaml` | Create a new wallet (onboarding) |
| 02 | `02_startup_restore.yaml` | Restore from nsec (onboarding) |
| 03–12 | smoke flows | Home, receive, send, swap, activity, settings, tabs, copy, scan |
| 13 | `13_unlock_wallet.yaml` | Lock / unlock (fixed test password in flow) |
| 14 | `14_home_scroll_balance_sticky.yaml` | Scroll / sticky balance |
| 15 | `15_settings_deep_reset_wallet.yaml` | Deep settings + wallet reset |

**Suites:**

- `_run_all_smoke.yaml` — flows 03–12 (wallet already on home)
- `_run_reset_then_create.yaml` — 15 → 02

**Reference flow** (baseline recording): `flows/01_startup_restore.yaml` — treat as the pattern reference; avoid casual edits.

### Scenarios (`scripts/run-scenario.sh`)

| Scenario | Runs |
|----------|------|
| `onboarding` | 01 + 02 |
| `smoke` | `_run_all_smoke.yaml` |
| `reset-restore` | `_run_reset_then_create.yaml` |
| `unlock` | 13 |
| `settings` | 08 + 15 (**resets** the wallet) |
| `prerelease` | smoke + reset-restore |
| `single <N>` | e.g. `single 09` |

## Recording new taps

When the UI changes or you use a different device:

```bash
./maestro/record-taps.sh
# Tap on the phone, then Ctrl+C when finished
python3 maestro/scripts/parse-taps.py maestro/recordings/raw-*.log
```

Turn the parsed output into subflows under `complete-tests/subflows/` or update flows directly.

## Configuration

| File | Purpose |
|------|---------|
| `config.yaml.example` | Template committed to git |
| `config.yaml` | Your local copy (gitignored) — **required** to run tests |
| `env.WALLET_PASSWORD` | Used by `ensure_on_wallet_home` when the wallet is locked (empty = skip unlock input) |

## Reference device

**All coordinates in this suite were recorded on this setup.**  
Another resolution, navigation mode, or Chrome layout will likely mis-tap until you re-record.

| Property | Value |
|----------|--------|
| **Model** | **Xiaomi 13T Pro** |
| **ADB serial** | `INBIJVCASW5HS4YX` |
| **Screen size** | **1220 × 2712** px (Maestro `widthPixels` / `heightPixels`) |
| **OS** | **Android 16** |
| **Navigation** | **3-button navigation bar enabled** (Back / Home / Recents visible) |
| **Important** | Android 16 defaults to **gesture navigation**. This suite assumes the **classic nav bar is ON**. Gesture-only navigation changes the usable screen area and tap targets — re-record if you switch. |
| **Browser** | Google Chrome (`com.android.chrome`) |
| **Keyboard** | Gboard (flows with `inputText` / unlock password) |
| **Maestro platform** | `-p android` (physical device, not desktop `chromium`) |

### Verify your device matches

```bash
adb devices
adb shell wm size                    # expect Physical size: 1220x2712
adb shell getprop ro.build.version.release
adb shell settings get secure navigation_mode
# 0 = 3-button, 1 = 2-button (legacy), 2 = gesture
```

When multiple devices are connected:

```bash
export ADB_DEVICE=INBIJVCASW5HS4YX
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `error: create maestro/config.yaml from config.yaml.example` | Missing local config | `cp maestro/config.yaml.example maestro/config.yaml` |
| No taps on phone; log shows `chromium` / `platform=WEB` | Desktop browser used | Use `run.sh` / `studio.sh` / `run-scenario.sh` (they pass `-p android`) |
| Opens **DFX** (“Buy or sell bitcoin”) | Wrong tab or scrolled home | Flows call `open_wallet_url` + scroll-to-top; check `WALLET_URL` |
| Taps miss buttons | Different device or nav mode | Re-record; enable 3-button nav or update coordinates |
| `no adb device` | USB / debugging | Reconnect, `adb devices`, accept RSA prompt |
| Recording exits with code 255 | ADB disconnect or killed `getevent` | Replug phone; stop recording with **Ctrl+C** |

## Reports

See [REPORTING.md](REPORTING.md). CI can consume JUnit XML from `maestro/reports/*.junit.xml`.

## Related tests in this repo

Playwright UI tests live under `src/test/e2e/` (browser automation in dev/CI). Maestro complements them with **real mobile Chrome** on hardware.
