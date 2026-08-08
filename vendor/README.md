# Vendored `@arkade-os` builds

Two tarballs built from `arkade-os/ts-sdk@feat/arkade-swap` at `752ed57`
(the merge of [ts-sdk#691](https://github.com/arkade-os/ts-sdk/pull/691)):

| File | Package | Why it is here |
| --- | --- | --- |
| `arkade-os-sdk-0.4.57-pr691-752ed57.tgz` | `@arkade-os/sdk` | Carries `VHTLC.ScriptV2`, which `@arkade-os/swap` needs and no published SDK has |
| `arkade-os-swap-0.0.1-pr691-752ed57.tgz` | `@arkade-os/swap` | Cannot be installed from git (see below) |

and one built from `arkade-os/solver-registry@master` at `fae0e06`
(the merge of
[solver-registry#18](https://github.com/arkade-os/solver-registry/pull/18)):

| File | Package | Why it is here |
| --- | --- | --- |
| `arkade-os-solver-discovery-0.2.2-master-fae0e06.tgz` | `@arkade-os/solver-discovery` | Carries `emulator_pubkey`, which no published version has (see below) |

This is a temporary bridge. It replaces the old git specifier
`github:arkade-os/ts-sdk#feat/arkade-swap&path:/packages/swap`, and it should
be deleted the moment all three packages are published to npm.

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

## Why `solver-discovery` is vendored, and the same trap again

`emulator_pubkey` — optional on the solver card, and propagated onto
`IndexMarket` by the reducer — landed on `solver-registry@master` in `797d6c0`
and merged as `fae0e06`. It is in no published build: `0.2.2` is the newest
version on npm, and `grep -rc emulator_pubkey` against its `dist/` is `0`.
The npm release is blocked on credentials, so until one ships the wallet reads
the field off a vendored build.

**This is trap 2 again, and worse.** The tarball's `package.json` still says
`0.2.2`, the *same version string* as the published-but-different build — the
version bump was recorded in `43a9dfa`, before `emulator_pubkey` was added. A
bare `"0.2.2"` specifier therefore resolves **silently** against the registry
copy that lacks the field. `@arkade-os/swap` also depends on
`@arkade-os/solver-discovery`, so the direct dependency alone is not enough:
the `pnpm.overrides` entry is what forces *every* copy in the tree, including
swap's, to the vendored file. Do not drop it, and do not trust version
resolution here.

Check with `grep -rc emulator_pubkey node_modules/@arkade-os/solver-discovery/dist/types.d.ts`
— a healthy install is non-zero (`3`: the field on the solver card, the field
on `IndexMarket`, and the doc comment above the latter).

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
update the references in `package.json` (`dependencies` plus `pnpm.overrides`)
and run `pnpm install`. Verify with `npx tsc --noEmit` —
a signature drift between the wallet's sources and the installed types shows
up there and nowhere else, because `vite build` strips types rather than
checking them and CI runs no typecheck.

For `solver-discovery` the equivalent is:

```sh
git clone https://github.com/arkade-os/solver-registry
cd solver-registry && git checkout <new-sha>
cd packages/discovery-client
npm run build
npm pack
```

Copy it into `vendor/` as `<pkg>-<version>-master-<shortsha>.tgz` (this one
tracks `master`, not a PR branch) and update both of its references.

## Removing this

Each tarball comes out independently, as soon as its package is on npm.

- **`solver-discovery`**: delete it once a real release **later than `0.2.2`**
  is published — `0.2.2` itself will not do, since that version already exists
  on npm without `emulator_pubkey`. Replace both `file:` references with a
  `>=` range on the new version.
- **`sdk` and `swap`**: replace their `file:` references with version ranges
  once both are published.

When all three are gone, delete the `pnpm.overrides` block and this directory,
and confirm `grep -rc ScriptV2 node_modules/@arkade-os/sdk/dist/` and
`grep -rc emulator_pubkey node_modules/@arkade-os/solver-discovery/dist/types.d.ts`
are both still non-zero against the published packages.
