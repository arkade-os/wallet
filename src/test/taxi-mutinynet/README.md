The live matrix uses Google Chrome for Alice and Carol and Microsoft Edge for Bob. Every actor is a fresh wallet with the production delegate leaf. It exercises 329 and 100 sats, a receiver-named Taxi, recycled asset delivery, claim deferral and activity actions, unavailable probes, policy refusals, and a normal send fallback.

Run only after the local Taxi matrix passes. Set these in the process environment, without putting credentials in command arguments or files:

- `TAXI_LIVE_FUNDER_MNEMONIC`: the original funded mutinynet wallet recovery phrase.
- `TAXI_LIVE_OPERATOR_KEY`: the independently verified Taxi operator public key.
- `TAXI_LIVE_SERVER_KEY`: the independently verified mutinynet arkd signer public key.
- `TAXI_LIVE_FUNDER_ADDRESS`: recommended check of the original funder's Ark address.
- `TAXI_LIVE_LOCAL=1`: serve this checkout on port 3114, or set `TAXI_LIVE_WALLET_URL` to the deployed wallet under test.
- Optional admin access: set all of `TAXI_ADMIN_URL`, `TAXI_ADMIN_USER` and `TAXI_ADMIN_PASS`. The URL must be HTTPS. Only GET requests are available to these tests.

```powershell
$env:NODE_ENV = 'test'
node node_modules/@playwright/test/cli.js test -c playwright.taxi-mutinynet.config.ts --list
node node_modules/@playwright/test/cli.js test -c playwright.taxi-mutinynet.config.ts
```

Preflight requires `/ready` status `ok`, `paused:false`, matching server/operator/co-signer keys, dust 330, minimum 1, and zero-sat recycle fares for bitcoin and assets. A metadata-only delegate provider and disabled background settlement preserve the funder's address shape without delegating or renewing its existing funds. The runner never opens that wallet in a browser or claims its existing deliveries.

Before funding, the runner reads each fresh actor's recovery identity through the backup UI into Node memory only, creates a matching static SDK wallet, and verifies its public address. These identities are also forbidden by the evidence guard. Funding is reserved before each send and bounded to Alice 3,000, Bob 1,500 and Carol 500 sats. Asset minting requires a dust coin and preserves its selected sats in the pinned SDK. Cleanup attempts any delivery this run left locked, then uses the UI to return each actor's minted assets and spendable sats to the original funder. A failed UI sweep falls back to its matching SDK wallet; remaining spendable balances are verified before contexts close and unresolved funds fail the run. A failed submission can still strand part of the 5,000-sat budget; review cleanup evidence before another run.

Trace, video, storage exports, automatic screenshots and failure page snapshots are disabled. `evidence.json` contains public addresses, amounts and this run's transfer identifiers only and is checked for credentials before writing. Paused/disabled probes alter only the browser's info response; unreachable probes abort a request. Settlement statuses always come from the real Taxi and are checked against the indexer's spent covenant and checkpoint chain.
