# Maestro tests

## Complete Tests

All E2E flows and subflows live under [`complete-tests/`](complete-tests/) (flows 01–15, smoke suites, shared subflows). Reference recording flow: [`complete-tests/flows/02_startup_restore.yaml`](complete-tests/flows/02_startup_restore.yaml).

## Configuration

Copy the example config and edit it locally (`config.yaml` is gitignored):

```bash
cp maestro/config.yaml.example maestro/config.yaml
```

Set these values under `env:` in [`config.yaml`](config.yaml):

| Variable | Required for | Purpose |
|----------|--------------|---------|
| `WALLET_URL` | All flows | Wallet URL opened in Chrome (`open_wallet_url` subflow) |
| `WALLET_NSEC` | `onboarding`, `reset-restore`, `prerelease` | Throwaway test wallet restore key |
| `WALLET_PASSWORD` | `unlock`, `prerelease`, smoke when wallet is locked | Password for locked-wallet flows |

**Do not** put `nsec` or password directly in flow YAML files. Maestro Studio does not reliably resolve `${WALLET_NSEC}` / `${WALLET_PASSWORD}` from env exports, so secrets are injected via generated subflows instead.

### How secrets reach the flows

1. You edit **`config.yaml`** only (never commit it).
2. Before each run, `studio.sh`, `run.sh`, and `run-scenario.sh` call [`scripts/sync-secret-subflows.py`](scripts/sync-secret-subflows.py).
3. That script writes two **gitignored** files in [`complete-tests/subflows/`](complete-tests/subflows/):
   - `_input_wallet_nsec.yaml` — from `WALLET_NSEC`
   - `_input_wallet_password.yaml` — from `WALLET_PASSWORD`
4. Committed flows call those subflows with `runFlow` (do not edit the generated files):

| Secret | Generated subflow | Used by |
|--------|-------------------|---------|
| `WALLET_NSEC` | `complete-tests/subflows/_input_wallet_nsec.yaml` | [`flows/02_startup_restore.yaml`](complete-tests/flows/02_startup_restore.yaml) |
| `WALLET_PASSWORD` | `complete-tests/subflows/_input_wallet_password.yaml` | [`flows/13_unlock_wallet.yaml`](complete-tests/flows/13_unlock_wallet.yaml), [`subflows/ensure_on_wallet_home.yaml`](complete-tests/subflows/ensure_on_wallet_home.yaml) |

Example `config.yaml` snippet:

```yaml
env:
  WALLET_URL: "https://your-preview-or-production-wallet-url"
  WALLET_NSEC: "nsec1your-throwaway-test-key"
  WALLET_PASSWORD: "your-test-password"
```

Regenerate secret subflows manually after editing `config.yaml`:

```bash
python3 maestro/scripts/sync-secret-subflows.py
```

Use a **throwaway test wallet** only — never commit a real or funded `nsec`.

## New approach: record manual taps first

Tests are built from **real taps on your device** (coordinates + timings), not guessed selectors.

### When you are ready

1. Open Arkade in Chrome on the phone (init screen).
2. Tell the agent you are ready.
3. On your machine run:

```bash
./maestro/record-taps.sh
```

4. Perform the **Startup Restore** flow manually (same steps as test 1).
5. Press **Ctrl+C** when done.
6. Share the generated file `maestro/recordings/taps-*.txt` (or ask the agent to read it).

The agent will turn that recording into subflows under `complete-tests/subflows/`.

### Studio (optional)

`./maestro/studio.sh` — Maestro Studio can also suggest selectors from the device screenshot.
