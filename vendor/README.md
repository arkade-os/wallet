# Solver routing and open RFQ snapshots

These archives keep the wallet installable before the upstream APIs are published.

| Archive | Source | SHA256 |
| --- | --- | --- |
| `arkade-os-solver-discovery-0.3.0-routing-6e9b577.tgz` | [solver-registry #42](https://github.com/arkade-os/solver-registry/pull/42), `6e9b577f075878732d2f805bd00bbd69cf29fc49` | `571f08835bae031be86b5acde6cd9ee22b3f047524ebf7ab464491be518a48bf` |
| `arkade-os-swap-0.1.6-open-rfq-1cb4f3de55d2.tgz` | [SDK f1ed16e3](https://github.com/arkade-os/ts-sdk/commit/f1ed16e330f511bafa1814733aa1f01b61a22723) (`a625f59d` plus [#1259](https://github.com/arkade-os/ts-sdk/pull/1259)), routing [#1198](https://github.com/arkade-os/ts-sdk/pull/1198) | `23326ba3360072c2eed802e250ad21825e51f7ec43d440dcd8e14d6cd70088ee` |

Swap contains the replacement open-RFQ implementation. It is built from the committed SDK source above; its matching manifest records 112 input-file hashes, source fingerprint `1cb4f3de55d250ee3b823c6d9a1f43736e9458ee1f29624badaa438b2a8653be`, archive integrity and 50 distribution files checked byte-for-byte against that build.

The built package is packed with workspace SDK and discovery references normalized to `0.5.6` and `0.3.0`. No runtime code is changed during packing. Workspace overrides pin the exact discovery archive and published SDK `0.5.6` throughout the graph. Discovery is built with its package build script and packed using `npm pack --ignore-scripts`.

After upstream publication, replace the file dependencies and discovery override with their corresponding releases, remove these archives and regenerate the lockfile. These are local snapshots; no npm release is made by this PR.
