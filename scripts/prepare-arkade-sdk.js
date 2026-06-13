/*
 * Builds @arkade-os/sdk and @arkade-os/boltz-swap from a pinned git ref and
 * packs them into ./vendor/*.tgz, which package.json references via file:.
 *
 * Why: the wallet temporarily consumes an unpublished SDK pull request
 * (arkade-os/ts-sdk). That repo is a pnpm monorepo whose packages are built
 * with tsup and ship only dist/, so they cannot be installed straight from a
 * git ref (no `prepare` script, build toolchain lives at the monorepo root,
 * and boltz-swap depends on the sdk via `workspace:*`). Instead we build the
 * tarballs from the pinned ref here, both locally (`pnpm prepare:sdk`) and in
 * CI (a step before `pnpm install`). The single source of truth is the
 * `arkadeSdk` field in package.json.
 *
 * Reuse an existing checkout (skips clone) with ARKADE_SDK_DIR=/path/to/ts-sdk.
 * Force a rebuild even when the cache marker matches with ARKADE_SDK_FORCE=1.
 *
 * Remove this script, the vendor/ refs and the arkadeSdk field once the SDK
 * changes are published to npm.
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const walletRoot = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(walletRoot, 'package.json'), 'utf8'))
const cfg = pkg.arkadeSdk || {}

if (!cfg.repo || !cfg.ref) {
  console.error('package.json is missing the "arkadeSdk" { repo, ref } config.')
  process.exit(1)
}

const vendorDir = path.join(walletRoot, 'vendor')
const refMarker = path.join(vendorDir, '.ref')
const targets = [
  { name: '@arkade-os/sdk', dir: path.join('packages', 'ts-sdk'), out: 'arkade-os-sdk.tgz' },
  { name: '@arkade-os/boltz-swap', dir: path.join('packages', 'boltz-swap'), out: 'arkade-os-boltz-swap.tgz' },
]

function run(cmd, cwd) {
  console.log(`$ ${cmd}${cwd ? `  (cwd: ${cwd})` : ''}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function capture(cmd, cwd) {
  return execSync(cmd, { cwd, encoding: 'utf8' }).trim()
}

// Prefer a directly-installed pnpm (CI), fall back to corepack (local).
function detectPnpm() {
  try {
    execSync('pnpm --version', { stdio: 'ignore' })
    return 'pnpm'
  } catch {
    return 'corepack pnpm'
  }
}

const cacheHit =
  !process.env.ARKADE_SDK_FORCE &&
  fs.existsSync(refMarker) &&
  fs.readFileSync(refMarker, 'utf8').trim() === cfg.ref &&
  targets.every((t) => fs.existsSync(path.join(vendorDir, t.out)))

if (cacheHit) {
  console.log(`vendor/ already built for ref ${cfg.ref}; skipping (ARKADE_SDK_FORCE=1 to rebuild).`)
  process.exit(0)
}

const pnpm = detectPnpm()
const reuseDir = process.env.ARKADE_SDK_DIR ? path.resolve(process.env.ARKADE_SDK_DIR) : null
const srcDir = reuseDir || path.join(walletRoot, '.arkade-sdk-src')

// 1. Get a checkout of the SDK monorepo at the pinned ref.
if (fs.existsSync(path.join(srcDir, '.git'))) {
  const head = capture('git rev-parse HEAD', srcDir)
  if (head !== cfg.ref) {
    try {
      run(`git fetch --depth 1 origin ${cfg.ref}`, srcDir)
    } catch {
      try {
        run('git fetch origin', srcDir)
      } catch {
        console.warn('git fetch failed; relying on local refs.')
      }
    }
    run(`git checkout --quiet --detach ${cfg.ref}`, srcDir)
  } else {
    console.log(`${srcDir} already at ${cfg.ref}.`)
  }
} else {
  if (reuseDir) {
    console.error(`ARKADE_SDK_DIR=${reuseDir} is not a git checkout.`)
    process.exit(1)
  }
  run(`git clone --filter=blob:none "${cfg.repo}" "${srcDir}"`)
  try {
    run(`git fetch --depth 1 origin ${cfg.ref}`, srcDir)
  } catch {
    /* ref may already be reachable from the default branch */
  }
  run(`git checkout --quiet --detach ${cfg.ref}`, srcDir)
}

// 2. Install + build the two packages we need (boltz-swap depends on sdk, so
//    a recursive build resolves them in topological order).
run(`${pnpm} install`, srcDir)
run(`${pnpm} --filter @arkade-os/sdk --filter @arkade-os/boltz-swap build`, srcDir)

// 3. Pack each package into vendor/ under a stable, version-independent name.
fs.mkdirSync(vendorDir, { recursive: true })
for (const t of targets) {
  const pkgDir = path.join(srcDir, t.dir)
  const distIndex = path.join(pkgDir, 'dist', 'index.js')
  if (!fs.existsSync(distIndex)) {
    console.error(`build produced no dist for ${t.name} (${distIndex} missing).`)
    process.exit(1)
  }
  const before = new Set(fs.readdirSync(pkgDir).filter((f) => f.endsWith('.tgz')))
  // We already ran the build above; skip each package's `prepack` (a redundant
  // rebuild that also shells out to a bare `pnpm`, which is not on PATH under a
  // corepack-only setup). `pnpm pack` has no --ignore-scripts, so force it.
  run(`${pnpm} pack --config.ignore-scripts=true`, pkgDir)
  const created = fs.readdirSync(pkgDir).filter((f) => f.endsWith('.tgz') && !before.has(f))
  if (created.length !== 1) {
    console.error(`expected exactly one new tarball for ${t.name}, found: ${created.join(', ') || 'none'}`)
    process.exit(1)
  }
  const dest = path.join(vendorDir, t.out)
  if (fs.existsSync(dest)) fs.rmSync(dest)
  fs.copyFileSync(path.join(pkgDir, created[0]), dest) // copy (not rename) to survive cross-drive
  fs.rmSync(path.join(pkgDir, created[0]))
  console.log(`packed ${t.name} -> vendor/${t.out}`)
}

fs.writeFileSync(refMarker, `${cfg.ref}\n`)
console.log(`\nDone. vendor/ built from ${cfg.repo}@${cfg.ref}`)
