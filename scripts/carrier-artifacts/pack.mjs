#!/usr/bin/env node
/**
 * MAINTAINER COMMAND. Nothing installs, builds or ships it, and both source
 * checkouts stay read-only.
 *
 *   node scripts/carrier-artifacts/pack.mjs --sdk <ts-sdk checkout> --taxi <arkade-taxi checkout>
 *
 * The Taxi leg runs that repository's own harness helpers in `packClient`'s
 * order, plus two overrides on the fresh consumer without which it takes the
 * REGISTRY SDK and the candidate swap will not load.
 */

import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  CANDIDATE_SDK_SYMBOL,
  CANDIDATE_SWAP_SYMBOL,
  PINNED_PACKAGES,
  PINNED_SOURCES,
  VENDOR_DIR,
  archiveManifest,
  assertCandidateExport,
  packageRootFrom,
  pinnedSourceMismatch,
  readJson,
  sha256,
} from './lib.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

// Grouped by repository, not by name: a package moved to a third source then
// fails the closure check below instead of being packed blind.
const SDK_SOURCE = PINNED_SOURCES['@arkade-os/sdk']
const TAXI_SOURCE = PINNED_SOURCES['@arkade-taxi/client']
const packagesFrom = (repository) => PINNED_PACKAGES.filter((name) => PINNED_SOURCES[name].repository === repository)
const SDK_PACKAGES = packagesFrom(SDK_SOURCE.repository)
const TAXI_PACKAGES = packagesFrom(TAXI_SOURCE.repository)
if (SDK_PACKAGES.length + TAXI_PACKAGES.length !== PINNED_PACKAGES.length)
  throw new Error('a pinned package names a source repository this command cannot pack from')

const args = process.argv.slice(2)
const flag = (name) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

const sdkRoot = flag('sdk') && resolve(flag('sdk'))
const taxiRoot = flag('taxi') && resolve(flag('taxi'))
const outDir = resolve(REPO, flag('out') ?? VENDOR_DIR)
if (!sdkRoot || !taxiRoot) {
  process.stderr.write('usage: pack.mjs --sdk <ts-sdk checkout> --taxi <arkade-taxi checkout> [--out <dir>]\n')
  process.exit(2)
}

const harness = await import(pathToFileURL(join(taxiRoot, 'scripts', 'lib', 'harness.mjs')).href)

const git = (cwd, ...argv) => execFileSync('git', ['-C', cwd, ...argv], { encoding: 'utf8' }).trim()

const assertPinnedSource = (root, source, label) => {
  const head = git(root, 'rev-parse', 'HEAD')
  if (head !== source.commit) throw new Error(`${label} is at ${head}, not the pinned ${source.commit}`)
  const dirty = git(root, 'status', '--porcelain')
  if (dirty) throw new Error(`${label} at ${source.commit} is dirty; pack only from a clean checkout:\n${dirty}`)
}

const runPnpm = (cwd, argv, npmUserConfig) => {
  const invocation = harness.packageManagerInvocation(argv)
  return execFileSync(invocation.command, invocation.args, {
    cwd,
    encoding: 'utf8',
    env: harness.packageManagerEnvironment(process.env, npmUserConfig),
    maxBuffer: 256 * 1024 * 1024,
  })
}

const spec = (from, path) => `file:${relative(from, path).replaceAll('\\', '/')}`

const scratch = mkdtempSync(join(tmpdir(), 'carrier-pack-'))
const archiveName = (name, version, commit) =>
  `${name.replace('@', '').replace('/', '-')}-${version}-${commit.slice(0, 8)}.tgz`

/** The repository LICENSE, for packages carrying no `license` field of their own. */
const repositoryLicense = (root) => {
  const headline = readFileSync(join(root, 'LICENSE'), 'utf8')
    .split(/\r?\n/)
    .find((line) => line.trim())
  if (!headline?.includes('MIT')) throw new Error(`${root}/LICENSE is not the MIT text this manifest would claim`)
  return 'MIT'
}

try {
  assertPinnedSource(sdkRoot, SDK_SOURCE, 'ts-sdk checkout')
  assertPinnedSource(taxiRoot, TAXI_SOURCE, 'arkade-taxi checkout')
  const checkoutOf = { [SDK_SOURCE.repository]: sdkRoot, [TAXI_SOURCE.repository]: taxiRoot }

  const npmUserConfig = join(scratch, 'pack.npmrc')
  writeFileSync(npmUserConfig, 'registry=https://registry.npmjs.org/\n@arkade-taxi:registry=http://127.0.0.1:9/\n')

  const sdkPackDir = join(scratch, 'sdk-packs')
  mkdirSync(sdkPackDir)
  const packed = []
  for (const name of SDK_PACKAGES) {
    // The SDK's `prepack` runs tsup, which writes to stdout, so `pack --json`
    // is unparseable here. The new file in the destination is not.
    const before = new Set(readdirSync(sdkPackDir))
    runPnpm(sdkRoot, ['--filter', name, 'pack', '--pack-destination', sdkPackDir], npmUserConfig)
    const produced = readdirSync(sdkPackDir).filter((entry) => entry.endsWith('.tgz') && !before.has(entry))
    if (produced.length !== 1) throw new Error(`packing ${name} produced ${produced.length} archives, expected one`)
    packed.push({ name, path: join(sdkPackDir, produced[0]) })
  }
  const candidate = Object.fromEntries(packed.map((entry) => [entry.name, entry.path]))

  const packDir = join(scratch, 'taxi-packs')
  const consumer = join(scratch, 'consumer')
  mkdirSync(packDir)
  mkdirSync(consumer)
  runPnpm(taxiRoot, ['-r', 'build'], npmUserConfig)
  const taxiTarballs = TAXI_PACKAGES.map((name) =>
    harness.assertPackResult(
      runPnpm(taxiRoot, ['--filter', name, 'pack', '--json', '--pack-destination', packDir], npmUserConfig),
      { name, packDir },
    ),
  )
  const beforeInstall = Object.fromEntries(taxiTarballs.map((path) => [path, sha256(readFileSync(path))]))

  const consumerManifest = harness.buildConsumerManifest(taxiTarballs, consumer)
  consumerManifest.pnpm.overrides['@arkade-os/sdk'] = spec(consumer, candidate['@arkade-os/sdk'])
  consumerManifest.pnpm.overrides['@arkade-os/swap'] = spec(consumer, candidate['@arkade-os/swap'])
  writeFileSync(join(consumer, 'package.json'), `${JSON.stringify(consumerManifest, null, 2)}\n`)
  runPnpm(
    consumer,
    ['--store-dir', join(scratch, 'pnpm-store'), 'install', '--ignore-scripts', '--frozen-lockfile=false'],
    npmUserConfig,
  )

  harness.assertTarballIntegrity(
    beforeInstall,
    Object.fromEntries(taxiTarballs.map((path) => [path, sha256(readFileSync(path))])),
  )
  const entry = harness.resolveInstalledClientEntry(consumer)
  harness.assertLocalConsumerResolution(
    consumerManifest,
    readFileSync(join(consumer, 'pnpm-lock.yaml'), 'utf8'),
    JSON.parse(runPnpm(consumer, ['list', '--json', '--depth=0'], npmUserConfig))[0],
  )
  for (const [name, symbol] of [
    ['@arkade-os/sdk', CANDIDATE_SDK_SYMBOL],
    ['@arkade-os/swap', CANDIDATE_SWAP_SYMBOL],
  ])
    await assertCandidateExport(packageRootFrom(entry, name), name, symbol)
  await import(pathToFileURL(entry).href)

  for (const path of taxiTarballs) {
    const { name } = archiveManifest(path)
    if (!TAXI_PACKAGES.includes(name)) throw new Error(`pack produced an unexpected package: ${name}`)
    packed.push({ name, path })
  }

  if (JSON.stringify(packed.map((entry) => entry.name).sort()) !== JSON.stringify([...PINNED_PACKAGES].sort()))
    throw new Error('packed set does not match the pinned set')

  const taxiLicense = repositoryLicense(taxiRoot)
  // Corepack resolves pnpm per repo, so one number for both would be wrong.
  const pnpmVersion = Object.fromEntries(
    [sdkRoot, taxiRoot].map((root) => [root, runPnpm(root, ['--version'], npmUserConfig).trim()]),
  )
  const artifacts = []
  mkdirSync(outDir, { recursive: true })
  for (const entry of packed.sort((a, b) => a.name.localeCompare(b.name))) {
    const manifest = archiveManifest(entry.path)
    if (manifest.name !== entry.name) throw new Error(`${entry.path}: archive declares ${manifest.name}`)
    const source = PINNED_SOURCES[entry.name]
    const sourceRoot = checkoutOf[source.repository]
    const file = archiveName(manifest.name, manifest.version, source.commit)
    copyFileSync(entry.path, join(outDir, file))
    const bytes = readFileSync(join(outDir, file))
    artifacts.push({
      file,
      package: manifest.name,
      version: manifest.version,
      license: manifest.license ?? taxiLicense,
      licenseFrom: manifest.license ? 'the package manifest' : 'the LICENSE file of the source repository',
      sha256: sha256(bytes),
      bytes: bytes.length,
      source: { ...source },
      toolchain: {
        node: process.version,
        pnpm: pnpmVersion[sourceRoot],
        declaredPackageManager: readJson(join(sourceRoot, 'package.json')).packageManager,
        command: `pnpm --filter ${manifest.name} pack`,
        platform: `${process.platform}-${process.arch}`,
      },
    })
  }

  for (const artifact of artifacts) {
    const mismatch = pinnedSourceMismatch(artifact)
    if (mismatch) throw new Error(mismatch)
  }

  const superseded = readdirSync(outDir).filter(
    (name) => name.endsWith('.tgz') && !artifacts.some((artifact) => artifact.file === name),
  )
  for (const name of superseded) rmSync(join(outDir, name))

  writeFileSync(
    join(outDir, 'manifest.json'),
    `${JSON.stringify(
      {
        note: 'Frozen candidate packages, built from source and never published to any registry. These digests are of THIS bundle: repacking @arkade-os/sdk from the same commit emits different declaration-chunk names, though no runtime module differs, so a re-pack is a deliberate re-freeze — run scripts/carrier-artifacts/pack.mjs, then pnpm install, then scripts/carrier-artifacts/verify.mjs.',
        packedAtUtc: new Date().toISOString(),
        artifacts,
      },
      null,
      2,
    )}\n`,
  )

  const where = relative(REPO, outDir).replaceAll('\\', '/') || VENDOR_DIR
  process.stdout.write(`${artifacts.length} archives frozen in ${where}\n`)
  for (const artifact of artifacts) process.stdout.write(`  ${artifact.sha256}  ${artifact.file}\n`)
  if (superseded.length) process.stdout.write(`removed superseded: ${superseded.join(', ')}\n`)
  process.stdout.write(`manifest: ${where}/manifest.json\n`)
} finally {
  try {
    rmSync(scratch, { recursive: true, force: true })
  } catch (error) {
    process.stderr.write(`could not remove ${scratch}: ${error.message}\n`)
  }
}
