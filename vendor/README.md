# Vendored `@arkade-os` builds

Built from [arkade-os/ts-sdk#1110](https://github.com/arkade-os/ts-sdk/pull/1110) at `b90b356`,
which adds the two seams this branch uses: `MessageBus`'s `onchainProvider` and the onchain
corridor's `chain: { provider }`.

Temporary. Once a release ships #1110, replace both `file:` references in `package.json` with it,
drop the `@arkade-os/sdk` override from `pnpm-workspace.yaml` and `package.json`, and delete this
directory.

The override is not optional while it lasts: the swap tarball asks for `@arkade-os/sdk@0.5.0-rc.25`,
which exists on npm without these changes, and would resolve against it silently.

## Regenerating

```sh
git clone --config core.autocrlf=false https://github.com/arkade-os/ts-sdk && cd ts-sdk
git checkout <sha> && pnpm install --frozen-lockfile && pnpm run build
(cd packages/sdk && pnpm pack --pack-destination /tmp/packed)
(cd packages/swap && pnpm pack --pack-destination /tmp/packed)
```

Name them `<pkg>-<version>-pr<n>-<shortsha>.tgz`, update the references, run `pnpm install`, and
check with `pnpm exec tsc --noEmit`: `vite build` strips types without checking them.
