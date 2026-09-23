#!/usr/bin/env node
// Prove the frozen archives are what this repository claims, and that nothing
// resolves past them to a registry build. Built-in Node only: it runs in the
// Docker layer BEFORE `pnpm install`.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BOOTSTRAP,
  CANDIDATE_SDK_SYMBOL,
  CANDIDATE_SWAP_SYMBOL,
  DIRECT_DEPENDENCIES,
  ENVIRONMENT,
  EXEMPT_INSTALLS,
  MANIFEST_PATH,
  PINNED_PACKAGES,
  VENDOR_DIR,
  archiveManifest,
  assertCandidateExport,
  dockerfileStages,
  fileSpec,
  installsDependencies,
  isComment,
  isOptOut,
  packageRootFrom,
  pinnedSourceMismatch,
  readFlatMapping,
  readJson,
  resolveInstalled,
  sha256,
  uninspectedInstall,
  unprovenDefaultShell,
  unverifiedInstall,
  workflowJobs,
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
const lock = readFileSync(at('pnpm-lock.yaml'), 'utf8')
const escape = (value) => value.replaceAll(/[.*+?^${}()|[\]\\/]/g, '\\$&')
for (const name of PINNED_PACKAGES) {
  const artifact = byPackage.get(name)
  const keys = [...lock.matchAll(new RegExp(`^ {2}'${escape(name)}@([^']+)':(?: \\{\\})?$`, 'gm'))]
  if (!check(keys.length > 0, `pnpm-lock.yaml resolves nothing for ${name}`)) continue
  for (const [, spec] of keys)
    check(
      spec.startsWith(`file:${VENDOR_DIR}/${artifact?.file}`),
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
  check(lock.includes(integrity), `pnpm-lock.yaml does not pin the bytes of ${artifact.file}`)
}

// The Docker dependency layer copies three manifests, this directory and the
// archives, so this group has nothing to read there; the unit suite runs in a
// whole checkout and asserts it was not skipped.
const wholeCheckout = existsSync(at('Dockerfile'))
if (wholeCheckout) {
  // One rule for every installing path: an install no runnable verify precedes,
  // scanned per Dockerfile stage or workflow job rather than per file.
  const workflowDir = at('.github', 'workflows')
  const workflows = existsSync(workflowDir) ? readdirSync(workflowDir).filter((name) => /\.ya?ml$/.test(name)) : []
  check(workflows.length > 0, '.github/workflows holds no workflow to scan')
  const sources = [['Dockerfile', readFileSync(at('Dockerfile'), 'utf8').split(/\r?\n/)]]
  const bootstrap = at(...BOOTSTRAP.split('/'))
  if (check(existsSync(bootstrap), `${BOOTSTRAP} is missing; its install can no longer be checked`))
    sources.push([BOOTSTRAP, readFileSync(bootstrap, 'utf8').split(/\r?\n/)])
  for (const file of workflows)
    sources.push([`.github/workflows/${file}`, readFileSync(join(workflowDir, file), 'utf8').split(/\r?\n/)])

  // Repointing `install` orphans the scanned script without editing one.
  const environment = at('.cursor', 'environment.json')
  if (check(existsSync(environment), `${ENVIRONMENT} is missing; the bootstrap binding cannot be checked`)) {
    const command = readJson(environment).install
    const bound = typeof command === 'string' && command.includes(BOOTSTRAP)
    check(bound, `${ENVIRONMENT} installs with ${JSON.stringify(command ?? null)}, which does not run ${BOOTSTRAP}`)
    // The whole command, not its prefix: `|| pnpm install` after a bootstrap
    // that exits non-zero installs exactly when verification failed.
    if (bound)
      check(!installsDependencies(command.replaceAll(BOOTSTRAP, '')), `${ENVIRONMENT} installs outside ${BOOTSTRAP}`)
  }

  // "Nothing to scan" must be distinguishable from "not scanned".
  const installs = (lines) => lines.filter((line) => !isComment(line) && installsDependencies(line)).length
  const scanned = []
  for (const [name, lines] of sources) {
    if (name === '.cursor/install.sh') {
      scanned.push([name, lines])
      continue
    }
    const units = name === 'Dockerfile' ? dockerfileStages(lines) : workflowJobs(lines.join('\n'))
    const label = name === 'Dockerfile' ? 'stage' : 'job'
    // Only where something installs: elsewhere an unreadable shell guards nothing.
    if (label === 'job' && installs(lines) > 0)
      check(
        !unprovenDefaultShell(lines.join('\n')),
        `${name} defaults every run to a shell this scan cannot prove keeps a failure fatal`,
      )
    if (!check(units.size > 0, `${name} yielded no ${label}s, so this scan cannot read it`)) continue
    check(
      [...units.values()].reduce((total, unit) => total + installs(unit), 0) === installs(lines),
      `${name} installs on a line this scan attributes to no ${label}`,
    )
    // Units are contiguous and ordered, so a cursor recovers the file line.
    let cursor = 0
    for (const [unit, unitLines] of units) {
      const start = lines.indexOf(unitLines[0], cursor)
      cursor = start + unitLines.length
      scanned.push([`${name} ${label} ${unit}`, unitLines, start])
    }
  }
  for (const [name, lines, offset = 0] of scanned) {
    const line = unverifiedInstall(lines)
    check(line === undefined, `${name} installs at line ${line + offset} without verifying the carrier artifacts first`)
    // Workflows only: the image build declines it, since it would evaluate the SDK inside Alpine.
    const uninspected = name.startsWith('.github/') ? uninspectedInstall(lines) : undefined
    check(
      uninspected === undefined,
      `${name} never inspects the install at line ${uninspected + offset}: no verify.mjs --installed runs after it`,
    )
    const installsAt = lines.findIndex((line) => !isComment(line) && installsDependencies(line))
    if (installsAt === -1 || !name.startsWith('Dockerfile')) continue
    const copiesAt = lines.findIndex(
      (line) => !isComment(line) && new RegExp(`^COPY .*${escape(VENDOR_DIR)}`).test(line),
    )
    check(copiesAt !== -1 && copiesAt < installsAt, `${name} installs before it copies ${VENDOR_DIR}`)
  }

  // A ceiling, not a quota: deleting a decorative marker must not turn this red.
  const markers = sources.reduce((total, [, lines]) => total + lines.filter(isOptOut).length, 0)
  check(
    markers <= EXEMPT_INSTALLS,
    `${markers} install exemptions are written across the scanned files, and ${EXEMPT_INSTALLS} is allowed`,
  )
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
    for (const from of [at('package.json'), entry]) {
      try {
        await assertCandidateExport(packageRootFrom(from, name), name, symbol)
      } catch (error) {
        failures.push(error.message)
      }
    }
  }
}

if (failures.length) fail(failures.join('\n  - '))
process.stdout.write(
  `carrier artifacts verified: ${manifest.artifacts.length} archives, lock pinned to their bytes, ` +
    `${wholeCheckout ? 'Dockerfile, workflows and bootstrap binding checked' : 'install context, no Dockerfile to check'}, ` +
    `${entry ? 'candidate exports confirmed in the installed tree' : 'no install to inspect yet'}\n`,
)
