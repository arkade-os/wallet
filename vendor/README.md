# Temporary SDK session export snapshot

`arkade-os-sdk-tree-session.tgz` is an unpublished compatibility build of SDK
0.5.0. The SDK code change exports its existing `TreeSignerSession` implementation
from the package root. Satochip implements the existing `Identity` interface in
the wallet; this snapshot contains no `BridgeIdentity` class or `IdentityBridge`
contract.

Its package version remains `0.5.0`, but this archive is not the registry's
published `@arkade-os/sdk@0.5.0` artifact. The root pnpm override makes the wallet,
swap plugin and LNURL client resolve the same SDK instance.

- Primary SDK change: [arkade-os/ts-sdk#1141](https://github.com/arkade-os/ts-sdk/pull/1141).
- Exact compatibility source: [`c30ac54b5950d435fbdaaab9553015a0641337cf`](https://github.com/arkade-os/ts-sdk/commit/c30ac54b5950d435fbdaaab9553015a0641337cf), on `feat/native-bridge-identity-v05`.
- Released 0.5.0 base: [`442a3f307c57a085a32565f07d1c90393a365e54`](https://github.com/arkade-os/ts-sdk/commit/442a3f307c57a085a32565f07d1c90393a365e54).
- Archive SHA-256: `417a7841b006e9fab9feea3127c50af64705e5c03e3b4a3f92a6f971c130f6d1`.
- Archive size: 2,642,608 bytes.

Reproduce the package from the exact source commit with the repository's Node and
pnpm versions:

```sh
git clone https://github.com/arkade-os/ts-sdk.git native-session-sdk
cd native-session-sdk
git checkout c30ac54b5950d435fbdaaab9553015a0641337cf
pnpm install --frozen-lockfile
pnpm -C packages/sdk pack --pack-destination ../../artifacts
```

The package's prepack script rebuilds its outputs. Copy the resulting
`artifacts/arkade-os-sdk-0.5.0.tgz` to this directory as
`arkade-os-sdk-tree-session.tgz`, verify its checksum and regenerate the wallet's
lockfile before installing with `--frozen-lockfile` and running the wallet gates.

This archive is a temporary draft-PR dependency, not a package release. Before
merging the wallet integration, publish an SDK version with the runtime export,
update the wallet's normal SDK dependency, and remove this archive and its
override together. Reconcile any other SDK override that merges first, including
[wallet#1123](https://github.com/arkade-os/wallet/pull/1123), instead of silently
replacing its dependency changes.
