# Vendored `@arkade-os` builds

Two tarballs built from `arkade-os/ts-sdk@feat/arkade-swap` at `752ed57`
(the merge of [ts-sdk#691](https://github.com/arkade-os/ts-sdk/pull/691)):

| File | Package | Why it is here |
| --- | --- | --- |
| `arkade-os-sdk-0.4.57-pr691-752ed57.tgz` | `@arkade-os/sdk` | Carries `VHTLC.ScriptV2`, which `@arkade-os/swap` needs and no published SDK has |
| `arkade-os-swap-0.0.1-pr691-752ed57.tgz` | `@arkade-os/swap` | Cannot be installed from git (see below) |

This is a temporary bridge. It replaces the old git specifier
`github:arkade-os/ts-sdk#feat/arkade-swap&path:/packages/swap`, and it should
be deleted the moment both packages are published to npm.

## Why not install from git

`packages/swap/package.json` on the branch declares `"@arkade-os/sdk":
"workspace:*"`. pnpm packs the subdirectory as-is for a git consumer, so the
install dies in `prepack` with the SDK types resolving to `{}`:

```
src/restore.ts(202,69): error TS2339: Property 'spentBy' does not exist on type '{}'.
ERR_PNPM_PREPARE_PACKAGE  Failed to prepare git-hosted package
```

Commit `7d94e46b` had fixed this by pinning a published version; `a63c69aa`
reverted it to `workspace:*` on 2026-08-07. Until that is fixed upstream, no
commit containing #691 is git-installable.

## Two traps, if you regenerate these

**1. Pinning the SDK back to a published version does not work.**
`packages/swap` uses `VHTLC.ScriptV2` (`rfq.ts`, via
`lightningSendVtxoScript`). Neither `@arkade-os/sdk@0.4.56` nor `0.4.57` on
npm contains that symbol — it is unreleased branch code.

**2. The branch's SDK version collides with a different published one.**
`packages/ts-sdk` on the branch is version `0.4.57`, and `0.4.57` also exists
on npm — published from another branch, *without* `ScriptV2`. So
`pnpm pack` rewriting `workspace:*` to `"@arkade-os/sdk": "0.4.57"` produces a
tarball that resolves **silently** against the wrong code rather than failing
loudly. That is what the `pnpm.overrides` entry in `package.json` exists to
prevent: it forces every `@arkade-os/sdk` in the tree, including the one
`@arkade-os/swap` asks for, to the vendored build. Do not drop that override
while the swap tarball still declares a bare version.

Check with `grep -rc ScriptV2 node_modules/@arkade-os/sdk/dist/` — a healthy
install is non-zero.

## Regenerating

```sh
git clone --branch feat/arkade-swap https://github.com/arkade-os/ts-sdk
cd ts-sdk && git checkout <new-sha>
pnpm install --ignore-scripts
pnpm --filter @arkade-os/sdk build
pnpm --filter @arkade-os/swap build
(cd packages/ts-sdk && pnpm pack --pack-destination /tmp/packed)
(cd packages/swap    && pnpm pack --pack-destination /tmp/packed)
```

Copy both into `vendor/` named `<pkg>-<version>-pr<n>-<shortsha>.tgz`, then
update the three references in `package.json` (two `dependencies`, one
`pnpm.overrides`) and run `pnpm install`. Verify with `npx tsc --noEmit` —
a signature drift between the wallet's sources and the installed types shows
up there and nowhere else, because `vite build` strips types rather than
checking them and CI runs no typecheck.

## Removing this

When both packages are on npm, replace the three `file:` references with
version ranges, delete the `pnpm.overrides` block and this directory, and
confirm `grep -rc ScriptV2 node_modules/@arkade-os/sdk/dist/` is still
non-zero against the published SDK.
