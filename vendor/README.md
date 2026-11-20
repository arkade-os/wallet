# Vendored packages

Unreleased builds of `@arkade-os/sdk` and `@arkade-os/swap`, which the Executor
integration needs (`registerBoarding`, `registerRenewal`). `pnpm-workspace.yaml`
overrides both packages with these tarballs.

Packed from [arkade-os/ts-sdk](https://github.com/arkade-os/ts-sdk) at
`19053b2e` (branch `feat/non-interactive-boarding`, which includes #1234 and #1256):

| File                       | Package                 |
| -------------------------- | ----------------------- |
| `arkade-os-sdk-0.5.9.tgz`  | `@arkade-os/sdk` 0.5.9  |
| `arkade-os-swap-0.1.9.tgz` | `@arkade-os/swap` 0.1.9 |

To refresh, from a ts-sdk checkout next to this repository:

```bash
(cd ../ts-sdk/packages/sdk && pnpm pack --pack-destination "$OLDPWD/vendor")
(cd ../ts-sdk/packages/swap && pnpm pack --pack-destination "$OLDPWD/vendor")
pnpm install
```

`pnpm pack` builds each package first. Update the file names here and in
`pnpm-workspace.yaml` if the versions change.

Remove this directory, and the overrides, once both packages are released.
