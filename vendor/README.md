# Vendored `@arkade-os` builds

| File | Built from |
| --- | --- |
| `arkade-os-sdk-0.5.0-pr1138-cf178d9a.tgz` | [arkade-os/ts-sdk#1138](https://github.com/arkade-os/ts-sdk/pull/1138) at `cf178d9a` |
| `arkade-os-swap-0.1.0-pr1138-cf178d9a.tgz` | the same commit |

A bridge until a release carries ts-sdk#1138: over Electrum, the published SDK reads every output
script of a deposit's or an HTLC's funding tx to learn one output's spend status, which includes
the payer's change and any service fee address. Delete this directory when the release ships.

Both tarballs keep the versions on ts-sdk `master` (`0.5.0`, `0.1.0`), which npm also has without
the fix, and the swap tarball depends on `@arkade-os/sdk` `0.5.0` exactly. A bare version would
therefore resolve silently to the published code. The `@arkade-os/sdk` override in
`pnpm-workspace.yaml` (mirrored in `package.json`) forces every copy in the tree to the vendored
file. Check with `grep -c "getTxOutspend(" node_modules/@arkade-os/sdk/dist/index.d.ts`, which is
non-zero only on the vendored build.

To regenerate from a ts-sdk checkout at a new commit:

```sh
pnpm install --frozen-lockfile && pnpm run build
(cd packages/sdk && pnpm pack --pack-destination /tmp/packed)
(cd packages/swap && pnpm pack --pack-destination /tmp/packed)
```

Rename each to `<pkg>-<version>-pr<n>-<shortsha>.tgz`, update the table above and the four `file:`
references, and run `pnpm install`.

To remove: set `@arkade-os/sdk` and `@arkade-os/swap` back to published versions, drop the
`@arkade-os/sdk` override from both files, delete this directory, and run `pnpm install`.
