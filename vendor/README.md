# Solver routing and open RFQ snapshots

These archives keep the wallet installable before the upstream APIs are published.

| Archive | Source | SHA256 |
| --- | --- | --- |
| `arkade-os-solver-discovery-0.3.0-routing-6e9b577.tgz` | [solver-registry #42](https://github.com/arkade-os/solver-registry/pull/42), `6e9b577f075878732d2f805bd00bbd69cf29fc49` | `571f08835bae031be86b5acde6cd9ee22b3f047524ebf7ab464491be518a48bf` |
| `arkade-os-swap-0.1.6-open-rfq-3596cda643cf.tgz` | [SDK a625f59d](https://github.com/arkade-os/ts-sdk/commit/a625f59d1d11eef53503f612d7f1a2850a129c34), routing [#1198](https://github.com/arkade-os/ts-sdk/pull/1198) | `a314898dc1c0d895674cb2d491aede46ac1d300e4ac6ef90e89671d7b28f041e` |

Swap contains the replacement open-RFQ implementation. It is built from the committed SDK source above; its matching manifest records 112 input-file hashes, source fingerprint `3596cda643cfdaf283a14c4c66208ba2eb78e1c94c17bf54610b195d57e0ad4f`, archive integrity and 50 distribution files checked byte-for-byte against that build.

The built package is packed with workspace SDK and discovery references normalized to `0.5.6` and `0.3.0`. No runtime code is changed during packing. Workspace overrides pin the exact discovery archive and published SDK `0.5.6` throughout the graph. Discovery is built with its package build script and packed using `npm pack --ignore-scripts`.

After upstream publication, replace the file dependencies and discovery override with their corresponding releases, remove these archives and regenerate the lockfile. These are local snapshots; no npm release is made by this PR.
