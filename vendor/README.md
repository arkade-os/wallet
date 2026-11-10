# Solver routing package snapshots

These archives keep this PR installable before its upstream APIs are published.

| Archive | Source | SHA256 |
| --- | --- | --- |
| `arkade-os-solver-discovery-0.3.0-routing-6e9b577.tgz` | [solver-registry #42](https://github.com/arkade-os/solver-registry/pull/42), `6e9b577f075878732d2f805bd00bbd69cf29fc49` | `571f08835bae031be86b5acde6cd9ee22b3f047524ebf7ab464491be518a48bf` |
| `arkade-os-swap-0.1.4-routing-73f69ba5.tgz` | [ts-sdk #1198](https://github.com/arkade-os/ts-sdk/pull/1198), `73f69ba51201c82fc5c8bc75dc0c3b59b91952c6` | `84febfd961ad36eacaa75189f6c2e5506249524675dd97476e06029acd299042` |

Discovery is built with its package build script and packed using `npm pack --ignore-scripts`.
Swap is built with its package build script; its built distribution is packed with workspace SDK
and local discovery dependency references normalized to `0.5.4` and `0.3.0`. No runtime code is
changed during packing. The workspace overrides pin the exact discovery snapshot and published
SDK `0.5.4` throughout the dependency graph.

TODO after upstream publication: replace the file dependencies and discovery override with their
corresponding releases, remove these archives, and regenerate the lockfile. No npm release is made by this PR.
