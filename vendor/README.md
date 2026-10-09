# vendor

`arkade-os-lnurl-client-0.5.2.tgz` is `@arkade-os/lnurl-client` packed from
[ArkLabsHQ/lnurl-server](https://github.com/ArkLabsHQ/lnurl-server) `packages/client` at commit
`28c6aa5` on `main`, the merge of ArkLabsHQ/lnurl-server#72 (the `payRequest()` memo), after #76 (bounded SSE frames, verify bound to its payment). It is vendored
because the package is not on npm yet.

## Refresh

From an lnurl-server checkout at the commit you want:

```bash
pnpm install
pnpm build:client
cd packages/client && pnpm pack --pack-destination <wallet>/vendor
```

Then in the wallet: delete the old tarball if the version changed, point the `file:vendor/...`
spec in `package.json` at the new file, run `pnpm install` (the lockfile pins the tarball's
integrity hash, so it must be regenerated even when the version is unchanged), and update the
commit above.

## Switching to npm

Once `@arkade-os/lnurl-client` is published, replace the `file:vendor/...` spec in `package.json`
with the version, run `pnpm install`, and delete this directory.
