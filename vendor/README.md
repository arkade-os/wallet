# Solver routing and open RFQ snapshots

These archives keep the wallet installable before the upstream APIs are published.

| Archive | Source | SHA256 |
| --- | --- | --- |
| `arkade-os-solver-discovery-0.3.0-routing-6e9b577.tgz` | [solver-registry #42](https://github.com/arkade-os/solver-registry/pull/42), `6e9b577f075878732d2f805bd00bbd69cf29fc49` | `571f08835bae031be86b5acde6cd9ee22b3f047524ebf7ab464491be518a48bf` |
| `arkade-os-swap-0.1.6-open-rfq-8b8a82433049.tgz` | [SDK 0d364a61](https://github.com/arkade-os/ts-sdk/commit/0d364a618e10a85a9a5f4cdeb47bc23b839c5d17), routing [#1198](https://github.com/arkade-os/ts-sdk/pull/1198) | `9a5cd0c9022f92d33daf900c6518e36f97585c4c11cb7aa4dbaeaff37c5d7b63` |

Swap contains the replacement open-RFQ implementation. It is built from the committed SDK source above; its matching manifest records 112 input-file hashes, source fingerprint `8b8a82433049e0d7f57cf43242a35f9303b8f7aaa174148a457ae6c5b7073f88`, archive integrity and 50 distribution files checked byte-for-byte against that build.

The built package is packed with workspace SDK and discovery references normalized to `0.5.6` and `0.3.0`. No runtime code is changed during packing. Workspace overrides pin the exact discovery archive and published SDK `0.5.6` throughout the graph. Discovery is built with its package build script and packed using `npm pack --ignore-scripts`.

After upstream publication, replace the file dependencies and discovery override with their corresponding releases, remove these archives and regenerate the lockfile. These are local snapshots; no npm release is made by this PR.
