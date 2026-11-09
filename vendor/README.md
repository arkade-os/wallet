# Solver routing package snapshots

These archives keep this PR installable before its upstream APIs are published.

| Archive | Source | SHA256 |
| --- | --- | --- |
| `arkade-os-solver-discovery-0.3.0-routing-f45f92e.tgz` | [solver-registry #42](https://github.com/arkade-os/solver-registry/pull/42), `f45f92e5bb8c24b1962dc753d5dc97bab782a1cc` | `baf89b56b80e84d671cbd5475a6ebafbc8b305aca6fbefb909ea8373360b2dca` |
| `arkade-os-swap-0.1.4-routing-cc797c10.tgz` | [ts-sdk #1198](https://github.com/arkade-os/ts-sdk/pull/1198), `cc797c10f82b6c7d4674c844f1b653f6bad9b29a` | `5bc99433bd979addcb0c83cf65733c6651583464166eb4841c76f941f799fc16` |

Discovery is built with its package build script and packed using `npm pack --ignore-scripts`.
Swap is built with its package build script; its built distribution is packed with workspace SDK
and local discovery dependency references normalized to `0.5.4` and `0.3.0`. No runtime code is
changed during packing. The workspace overrides pin the exact discovery snapshot and published
SDK `0.5.4` throughout the dependency graph.

Replace the file dependencies and discovery override with their corresponding published releases
once available, remove these archives, and regenerate the lockfile. No npm release is made by this PR.
