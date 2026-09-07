# Vendored `@arkade-os` builds

| File | Package | Why it is here |
| --- | --- | --- |
| `arkade-os-swap-0.0.12-master-d652ab6d.tgz` | `@arkade-os/swap` | Carries [ts-sdk#850](https://github.com/arkade-os/ts-sdk/pull/850), which no published version has |

Built from `arkade-os/ts-sdk@master` at `d652ab6d` — the merge of ts-sdk#850,
*"omit claim_packet when there is no covclaimd to seal to"*.

**This is a temporary bridge. Delete it the moment `@arkade-os/swap` is
published with that fix**, and restore the plain version specifier.

## Why the version pin alone is not enough

The tarball's `package.json` still says **`0.0.12`** — the same version string
as the published-but-different build, because #850 landed without a version
bump. A bare `"0.0.12"` specifier therefore resolves silently against the
registry copy, which still seals unconditionally.

That is why this pins through **`pnpm.overrides` as well as** the direct
dependency: the override is what forces every copy in the tree to the vendored
build, including any transitive one. Removing either half re-opens the hole
without failing the install, which is the trap worth knowing about — the same
one the earlier `@arkade-os/solver-discovery` vendoring hit for the identical
reason (see `24b39ab6`).

## What breaks without it

`getCovclaimdPubkeyForNetwork` returns `undefined` on the networks with no
covclaimd configured. Published `0.0.12` seals unconditionally, so that
`undefined` reaches `sealWithEntropy`'s `input.covclaimdPubkey.length` and
throws `Cannot read properties of undefined (reading 'length')` on **every**
Lightning receive on `bitcoin`, `signet` and `testnet` — strictly worse than
the silent guarantee-loss it replaces (wallet#952).
