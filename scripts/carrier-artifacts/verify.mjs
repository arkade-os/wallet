#!/usr/bin/env node
// Prove the frozen archives are what this repository claims, and that nothing
// resolves past them to a registry build. Built-in Node only: it runs in the
// Docker layer BEFORE `pnpm install`.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CANDIDATE_SDK_SYMBOL,
  CANDIDATE_SWAP_SYMBOL,
  CANDIDATE_TAXI_SYMBOL,
  CANDIDATE_TAXI_FILL_SYMBOL,
  DIRECT_DEPENDENCIES,
  MANIFEST_PATH,
  PINNED_PACKAGES,
  VENDOR_DIR,
  archiveManifest,
  assertCandidateExport,
  fileSpec,
  packageRootFrom,
  pinnedSourceMismatch,
  readFlatMapping,
  readJson,
  resolveInstalled,
  sha256,
} from './lib.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const at = (...parts) => join(REPO, ...parts)
const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  return condition
}

// A named reason rather than a stack trace, because a Docker log is where this one lands.
const fail = (reason) => {
  process.stderr.write(`carrier artifacts FAILED:\n  - ${reason}\n`)
  process.exit(1)
}
if (!existsSync(at(MANIFEST_PATH))) fail(`${MANIFEST_PATH} is missing; the frozen archives are not in this tree`)
if (!existsSync(at(VENDOR_DIR))) fail(`${VENDOR_DIR} is missing; the frozen archives are not in this tree`)

const manifest = readJson(at(MANIFEST_PATH))
const byPackage = new Map(manifest.artifacts?.map((artifact) => [artifact.package, artifact]) ?? [])
check(
  JSON.stringify([...byPackage.keys()].sort()) === JSON.stringify([...PINNED_PACKAGES].sort()),
  `${MANIFEST_PATH} covers ${[...byPackage.keys()].join(', ')}, expected exactly ${PINNED_PACKAGES.join(', ')}`,
)

const present = readdirSync(at(VENDOR_DIR)).filter((name) => name !== 'manifest.json')
const expected = manifest.artifacts?.map((artifact) => artifact.file) ?? []
check(
  JSON.stringify([...present].sort()) === JSON.stringify([...expected].sort()),
  `${VENDOR_DIR} holds ${present.join(', ')}, and the manifest lists ${expected.join(', ')}`,
)

for (const artifact of manifest.artifacts ?? []) {
  const path = at(VENDOR_DIR, artifact.file)
  if (!check(existsSync(path), `${artifact.file} is listed in the manifest and missing from ${VENDOR_DIR}`)) continue
  const bytes = readFileSync(path)
  check(bytes.length === artifact.bytes, `${artifact.file} is ${bytes.length} bytes, manifest says ${artifact.bytes}`)
  check(sha256(bytes) === artifact.sha256, `${artifact.file} sha256 ${sha256(bytes)} != manifest ${artifact.sha256}`)

  const declared = archiveManifest(path)
  check(
    declared.name === artifact.package && declared.version === artifact.version,
    `${artifact.file} contains ${declared.name}@${declared.version}, manifest says ${artifact.package}@${artifact.version}`,
  )
  const mismatch = pinnedSourceMismatch(artifact)
  check(mismatch === undefined, mismatch ?? '')
  check(
    artifact.file.endsWith(`-${artifact.version}-${artifact.source?.commit?.slice(0, 8)}.tgz`),
    `${artifact.file} does not carry its version and source commit in its name`,
  )
  check(Boolean(artifact.license), `${artifact.file} records no license`)
  check(
    Boolean(artifact.toolchain?.node && artifact.toolchain?.pnpm && artifact.toolchain?.command),
    `${artifact.file} records no build toolchain`,
  )
}

// pnpm 10 takes settings from pnpm-workspace.yaml; a second `pnpm.overrides` in
// package.json would be the half that silently loses.
const overrides = readFlatMapping(readFileSync(at('pnpm-workspace.yaml'), 'utf8'), 'overrides') ?? {}
for (const name of PINNED_PACKAGES) {
  const artifact = byPackage.get(name)
  check(
    artifact !== undefined && overrides[name] === fileSpec(VENDOR_DIR, artifact.file),
    `pnpm-workspace.yaml override of ${name} is ${overrides[name]}, which is not a frozen archive`,
  )
}
const root = readJson(at('package.json'))
check(root.pnpm?.overrides === undefined, 'package.json declares pnpm.overrides, which pnpm-workspace.yaml overrules')

for (const name of DIRECT_DEPENDENCIES) {
  const spec = root.dependencies?.[name]
  check(
    spec === fileSpec('./vendor/carrier', byPackage.get(name)?.file),
    `package.json declares ${name} as ${spec}, which is not the frozen archive`,
  )
}

// Where a registry build reappears: every resolution must name a frozen archive,
// and the integrity pnpm recorded must be the sha512 of the committed bytes.
const lock = readFileSync(at('pnpm-lock.yaml'), 'utf8').replaceAll('\r\n', '\n')
const escape = (value) => value.replaceAll(/[.*+?^${}()|[\]\\/]/g, '\\$&')
for (const name of PINNED_PACKAGES) {
  const artifact = byPackage.get(name)
  const expected = artifact ? `file:${VENDOR_DIR}/${artifact.file}` : undefined
  const keys = [...lock.matchAll(new RegExp(`^ {2}'${escape(name)}@([^']+)':(?: \\{\\})?$`, 'gm'))]
  if (!check(keys.length > 0, `pnpm-lock.yaml resolves nothing for ${name}`)) continue
  for (const [, spec] of keys)
    check(
      spec === expected || spec.startsWith(`${expected}(`),
      `pnpm-lock.yaml resolves ${name}@${spec}, which is not the frozen archive`,
    )
  check(
    overrides[name] !== undefined && lock.includes(`'${name}': ${overrides[name]}`),
    `pnpm-lock.yaml does not record the override of ${name}`,
  )
  if (!artifact || !existsSync(at(VENDOR_DIR, artifact.file))) continue
  const integrity = `sha512-${createHash('sha512')
    .update(readFileSync(at(VENDOR_DIR, artifact.file)))
    .digest('base64')}`
  const resolution = new RegExp(
    `^ {2}'${escape(name)}@${escape(expected)}':\\n {4}resolution: \\{integrity: ${escape(integrity)}, tarball: ${escape(expected)}\\}$`,
    'm',
  )
  check(resolution.test(lock), `pnpm-lock.yaml does not bind ${name} to its archive bytes`)
}

// What actually resolved, when there is an install to ask.
let entry
try {
  entry = resolveInstalled(at('package.json'), '@arkade-taxi/client')
} catch (error) {
  failures.push(error.message)
}
check(
  entry !== undefined || !process.argv.includes('--installed'),
  '--installed was given, and there is no @arkade-taxi/client install to inspect',
)
if (entry) {
  for (const [name, symbol] of [
    ['@arkade-os/sdk', CANDIDATE_SDK_SYMBOL],
    ['@arkade-os/swap', CANDIDATE_SWAP_SYMBOL],
  ]) {
    const roots = name === '@arkade-os/sdk' ? [at('package.json'), entry] : [at('package.json')]
    for (const from of roots) {
      try {
        await assertCandidateExport(packageRootFrom(from, name), name, symbol)
      } catch (error) {
        failures.push(error.message)
      }
    }
  }
  for (const [symbol, subpath, requiredMethod] of [
    [CANDIDATE_TAXI_SYMBOL, './wallet'],
    [CANDIDATE_TAXI_FILL_SYMBOL, '.', 'submitFill'],
  ]) {
    try {
      await assertCandidateExport(
        packageRootFrom(entry, '@arkade-taxi/client'),
        '@arkade-taxi/client',
        symbol,
        subpath,
        requiredMethod,
      )
    } catch (error) {
      failures.push(error.message)
    }
  }
}

if (failures.length) fail(failures.join('\n  - '))
process.stdout.write(
  `carrier artifacts verified: ${manifest.artifacts.length} archives, lock pinned to their bytes, ` +
    `${entry ? 'candidate exports confirmed in the installed tree' : 'no install to inspect yet'}\n`,
)
