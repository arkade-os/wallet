# Solver routing and open RFQ snapshots

These archives keep this PR installable before its upstream APIs are published.

| Archive | Source | SHA256 |
| --- | --- | --- |
| `arkade-os-solver-discovery-0.3.0-routing-6e9b577.tgz` | [solver-registry #42](https://github.com/arkade-os/solver-registry/pull/42), `6e9b577f075878732d2f805bd00bbd69cf29fc49` | `571f08835bae031be86b5acde6cd9ee22b3f047524ebf7ab464491be518a48bf` |
| `arkade-os-swap-0.1.6-open-rfq-5fcfa110506d.tgz` | SDK base `648b5905fe640611042a44a66f6304243ca208c7`, routing [#1198](https://github.com/arkade-os/ts-sdk/pull/1198) `e94179f6`, and open RFQ source fingerprint `5fcfa110506dbe2137eb8efc4a0507039ca13651792e606e95049c3ce753d74c` | `65e44cb111bf2a455fb1789e4fa21f73d011ff540b34df779ef7fa3ab9009608` |

Discovery is built with its package build script and packed using `npm pack --ignore-scripts`.
Swap is built with its package build script; its built distribution is packed with workspace SDK
and local discovery dependency references normalized to `0.5.6` and `0.3.0`. No runtime code is
changed during packing. The workspace overrides pin the exact discovery snapshot and published
SDK `0.5.6` throughout the dependency graph. The matching manifest records the complete source
fingerprint, archive integrity and fifty distribution files checked byte-for-byte against the
browser/Node build. This is a local snapshot, not a published swap release.

TODO after upstream publication: replace the file dependencies and discovery override with their
corresponding releases, remove these archives, and regenerate the lockfile. No npm release is made by this PR.
