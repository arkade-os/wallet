# Vendored: `@arkade-os/swap` (send leg)

These files are copied **verbatim** from the Arkade SDK monorepo. Do not edit them here.

| Field | Value |
| --- | --- |
| Source repo | `arkade-os/ts-sdk` |
| Source branch | `claude/arkade-intents-swap-extraction-nb5420` (PR [#667](https://github.com/arkade-os/ts-sdk/pull/667)) |
| Pinned commit | `36bf317` |
| Source path | `packages/swap/src/` |
| Files | `rfq.ts`, `onchainHtlc.ts`, `swap-lightning-send.program.json` |

## Why vendored rather than installed

`@arkade-os/swap` is not on npm — the package merged to ts-sdk `master` (via ts-sdk#679) but has
never been published, and `@arkade-os/ln-swap` does not exist at all. Installing it straight from
git does not work either, for two independent reasons:

- it builds through a **`prepack`** script, but git installs only run `prepare`, so a git dependency
  resolves with no `dist/`;
- it declares `"@arkade-os/sdk": "workspace:*"`, and the `workspace:` protocol only resolves inside
  the ts-sdk monorepo — pnpm rewrites it to a real version at publish time, which a git install
  never reaches.

Vendoring needs **no new dependencies**: `@noble/hashes`, `@noble/curves`, `@scure/base` and
`@scure/btc-signer` are already in this wallet at the exact versions the package pins, and every
`@arkade-os/sdk` symbol these files import (`ArkAddress`, `RestArkProvider`, `RestEmulatorProvider`,
`arkade`, `asset`, `getNetwork`, `IWallet`, `NetworkName` — including `arkade.parseArtifact` and
`arkade.ArkadeProgramScript`) is exported by the pinned SDK **0.4.56**. No SDK bump is required.

## Drift risk

The pinned commit is on an **open, unmerged PR that is still being changed** — `rfq.ts` was
rewritten twice in one day on that branch, including a maker/taker rename. Treat this copy as a
snapshot, not a fork: re-copy from the pinned source rather than patching in place.

## Replacing this directory

When `@arkade-os/swap` is published:

1. `pnpm add @arkade-os/swap@<version>`
2. Change the imports in `src/lib/lnSwap.ts` from `./arkadeSwap/rfq` to `@arkade-os/swap`.
3. Delete this directory and drop its entries from `.prettierignore` / `.eslintignore`.

The seam in `src/lib/lnSwap.ts` exists so that step 2 is the only code change required.

## Lint

These files keep the SDK's formatting (4-space, double quotes, semicolons), which conflicts with
this repo's prettier and the eslint `quotes: single` rule. They are excluded in `.prettierignore`
and `.eslintignore` so the copy stays byte-identical to upstream and can be diffed against it.
