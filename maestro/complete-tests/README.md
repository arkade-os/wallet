# Complete Tests

Full Maestro E2E suite for Arkade Wallet on Android Chrome (flows 01–15 and smoke suites).

```
complete-tests/
  flows/      — numbered tests and _run_*.yaml suites
  subflows/   — shared waits, taps, navigation, generated secrets
```

Reference flow for recording patterns: `flows/02_startup_restore.yaml`

## Secrets (nsec and wallet password)

**Source of truth:** `maestro/config.yaml` → `env.WALLET_NSEC` and `env.WALLET_PASSWORD`.

**Do not** add secrets to committed YAML. Flows reference auto-generated subflows:

```
config.yaml
    └── sync-secret-subflows.py
            ├── subflows/_input_wallet_nsec.yaml      (gitignored)
            └── subflows/_input_wallet_password.yaml  (gitignored)
                    ▲
                    │ runFlow
        flows/02_startup_restore.yaml          → _input_wallet_nsec.yaml
        flows/13_unlock_wallet.yaml            → _input_wallet_password.yaml
        subflows/ensure_on_wallet_home.yaml    → _input_wallet_password.yaml (when locked)
```

After changing `config.yaml`:

```bash
python3 maestro/scripts/sync-secret-subflows.py
# or run any entrypoint — they sync automatically:
./maestro/studio.sh
./maestro/scripts/run-scenario.sh onboarding
```

See [`../README.md`](../README.md) for the full configuration table and scenario requirements.
