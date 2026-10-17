# Lightning claim status patch

`@arkade-os/swap@0.1.0-rc.27` can classify a claim checkpoint as a refund when
the indexer serves it before its condition witness is attached. Adding that
witness does not change the transaction ID. The terminal refund state then
prevents another classification attempt.

The pnpm patch requires a recognized refund leaf for every lockup output before
reporting a refund. A claim with missing or invalid preimage evidence stays
unresolved until a hash-verified preimage is available.

On client startup, stored refunded Lightning sends without a locally submitted
refund transaction are checked against the indexer. A verified claim corrects
the stored status and receipt. An unavailable or inconclusive read leaves the
record intact and can be retried at the next startup. This submits no payment
or refund transaction. Readonly clients and onchain sends retain their existing
behavior.

Remove the patch when upgrading to a published swap package that includes both
the classification fix and historical-record reconciliation. The wallet's
installed-package regression check is:

```sh
pnpm exec vitest run src/test/lib/lnClaimStatus.test.ts
```
