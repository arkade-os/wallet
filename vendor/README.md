# Solver routing package snapshots

These archives keep this PR installable before its upstream APIs are published.

| Archive | Source | SHA256 |
| --- | --- | --- |
| `arkade-os-solver-discovery-0.3.0-routing-2ee6a81.tgz` | [solver-registry #42](https://github.com/arkade-os/solver-registry/pull/42), `2ee6a813b346a20d0320429f4b15df6c526f86ec` | `88cc3f9ddf3d30c86e8873657dd080cf8d7342ed4b55f8f1774d40754d7827a6` |
| `arkade-os-swap-0.1.4-routing-0bf144e1.tgz` | [ts-sdk #1198](https://github.com/arkade-os/ts-sdk/pull/1198), `0bf144e1ecf5ced5f89d5fcdd357ad94399ca90b` | `af0e080d96e2566affe7bfc115a797efa3e90bafdc21d709d084ede234e65633` |

Discovery is built with its package build script and packed using `npm pack --ignore-scripts`.
Swap is built with its package build script; its built distribution is packed with workspace SDK
and local discovery dependency references normalized to `0.5.4` and `0.3.0`. No runtime code is
changed during packing. The workspace overrides pin the exact discovery snapshot and published
SDK `0.5.4` throughout the dependency graph.

TODO after upstream publication: replace the file dependencies and discovery override with their
corresponding releases, remove these archives, and regenerate the lockfile. No npm release is made by this PR.
