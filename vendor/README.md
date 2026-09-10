# Vendored packages

`arkade-os-sdk-0.4.71-pr901-952e7d0.tgz` and
`arkade-os-swap-0.0.14-pr901-952e7d0.tgz` were built with `pnpm pack` from
[`arkade-os/ts-sdk#901`](https://github.com/arkade-os/ts-sdk/pull/901) commit
`952e7d09`. That branch starts at current `ts-sdk` master, which contains
[#899](https://github.com/arkade-os/ts-sdk/pull/899),
[#892](https://github.com/arkade-os/ts-sdk/pull/892), and
[#893](https://github.com/arkade-os/ts-sdk/pull/893). The tarballs pin the same
restore-hook registry and asset-swap recovery implementation: the swap helper
registers with the core SDK, and the core SDK runs it after explicit wallet
recovery. Replace both together with published releases after #901 merges.
