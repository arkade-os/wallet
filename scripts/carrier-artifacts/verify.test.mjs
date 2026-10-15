// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { MANIFEST_PATH, VENDOR_DIR, packageRootFrom } from './lib.mjs'

const scripts = dirname(fileURLToPath(import.meta.url))
const repo = join(scripts, '..', '..')
const manifest = JSON.parse(readFileSync(join(repo, MANIFEST_PATH), 'utf8'))
const candidates = new Set(manifest.artifacts.map(({ package: name }) => name))
let root
let sdk
let sdkEntry
let marker

const removeFixture = (path) => {
  const target = resolve(path)
  if (
    dirname(root) !== resolve(tmpdir()) ||
    !basename(root).startsWith('carrier-installed-') ||
    (target !== root && !target.startsWith(`${root}${sep}`))
  )
    throw new Error(`refusing to remove outside the temporary fixture: ${target}`)
  rmSync(target, { recursive: true, force: true })
}

const link = (target, path) => {
  mkdirSync(dirname(path), { recursive: true })
  symlinkSync(target, path, 'junction')
}
const installDependencies = (original, installed) => {
  const declared = JSON.parse(readFileSync(join(original, 'package.json'), 'utf8'))
  const require = createRequire(join(original, 'package.json'))
  for (const name of Object.keys({
    ...declared.dependencies,
    ...declared.peerDependencies,
    ...declared.optionalDependencies,
  })) {
    const target = candidates.has(name)
      ? join(root, 'node_modules', name)
      : require.resolve
          .paths(name)
          .map((path) => join(path, name))
          .find(existsSync)
    if (target) {
      link(target, join(installed, 'node_modules', name))
      const fallback = join(root, 'node_modules', name)
      if (!candidates.has(name) && !existsSync(fallback)) link(target, fallback)
    }
  }
}
const run = () =>
  spawnSync(process.execPath, [join(root, 'scripts/carrier-artifacts/verify.mjs'), '--installed'], { encoding: 'utf8' })
const markEntry = () => {
  const original = readFileSync(sdkEntry)
  writeFileSync(
    sdkEntry,
    Buffer.concat([
      original,
      Buffer.from(
        `\nimport { writeFileSync as payloadMarker } from 'node:fs'; payloadMarker(${JSON.stringify(marker)}, 'executed');\n`,
      ),
    ]),
  )
  return () => writeFileSync(sdkEntry, original)
}
const rejectedBeforeImport = (result, message) => {
  expect(result.stderr).toContain(message)
  expect(result.status).toBe(1)
  expect(existsSync(marker)).toBe(false)
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'carrier-installed-'))
  const fixtureScripts = join(root, 'scripts/carrier-artifacts')
  mkdirSync(fixtureScripts, { recursive: true })
  for (const name of ['lib.mjs', 'verify.mjs']) copyFileSync(join(scripts, name), join(fixtureScripts, name))
  for (const name of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'])
    if (existsSync(join(repo, name))) copyFileSync(join(repo, name), join(root, name))
  cpSync(join(repo, VENDOR_DIR), join(root, VENDOR_DIR), { recursive: true })
  if (existsSync(join(repo, 'packages')))
    for (const entry of readdirSync(join(repo, 'packages'), { withFileTypes: true })) {
      const path = join('packages', entry.name, 'package.json')
      if (!entry.isDirectory() || !existsSync(join(repo, path))) continue
      mkdirSync(dirname(join(root, path)), { recursive: true })
      copyFileSync(join(repo, path), join(root, path))
    }
  const taxiEntry = createRequire(join(repo, 'package.json')).resolve('@arkade-taxi/client')
  for (const artifact of manifest.artifacts) {
    const installed = join(root, 'node_modules', artifact.package)
    mkdirSync(installed, { recursive: true })
    const tar = process.platform === 'win32' ? join(process.env.SystemRoot, 'System32/tar.exe') : 'tar'
    const result = spawnSync(
      tar,
      ['-xzf', join(root, VENDOR_DIR, artifact.file), '-C', installed, '--strip-components=1'],
      { encoding: 'utf8' },
    )
    expect(result.status, result.stderr).toBe(0)
    const from = artifact.package.startsWith('@arkade-taxi/') ? taxiEntry : join(repo, 'package.json')
    installDependencies(packageRootFrom(from, artifact.package), installed)
  }
  if (!existsSync(join(root, 'node_modules/@scure/btc-signer')))
    link(packageRootFrom(join(repo, 'package.json'), '@scure/btc-signer'), join(root, 'node_modules/@scure/btc-signer'))
  if (existsSync(join(root, 'packages/solver-app/package.json')))
    link(join(root, 'node_modules'), join(root, 'packages/solver-app/node_modules'))
  sdk = join(root, 'node_modules/@arkade-os/sdk')
  const declared = JSON.parse(readFileSync(join(sdk, 'package.json'), 'utf8'))
  sdkEntry = join(sdk, declared.exports['.'].import.default)
  marker = join(root, 'imported-marker')
})

afterAll(() => {
  if (root) removeFixture(root)
})

it('accepts an unchanged installation extracted from the frozen archives', () => {
  const result = run()
  expect(result.status, result.stderr).toBe(0)
})

it('rejects changed installed code with the same package version and exports before importing it', () => {
  const restore = markEntry()
  try {
    rejectedBeforeImport(run(), 'installed bytes differ')
  } finally {
    restore()
    rmSync(marker, { force: true })
  }
})

it('authenticates a separate SDK resolved through a Taxi dependency', () => {
  const path = join(root, 'node_modules/@arkade-taxi/client/node_modules/@arkade-os/sdk')
  rmSync(path)
  cpSync(sdk, path, { recursive: true, dereference: false })
  const originalEntry = sdkEntry
  sdkEntry = join(path, originalEntry.slice(sdk.length + 1))
  const restore = markEntry()
  try {
    rejectedBeforeImport(run(), 'installed bytes differ')
  } finally {
    restore()
    sdkEntry = originalEntry
    removeFixture(path)
    link(sdk, path)
    rmSync(marker, { force: true })
  }
})

it('rejects package files absent from the archive', () => {
  const path = join(sdk, 'dist/extra.js')
  writeFileSync(path, 'export const extra = true')
  try {
    const result = run()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('unexpected installed file')
  } finally {
    rmSync(path)
  }
})

it('rejects symlinked package directories', () => {
  const path = join(sdk, 'linked-payload')
  link(join(sdk, 'dist'), path)
  try {
    const result = run()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('installed file is not regular')
  } finally {
    rmSync(path)
  }
})

it('rejects a regular package file named node_modules', () => {
  const path = join(sdk, 'node_modules')
  const dependencies = join(root, 'sdk-dependencies')
  renameSync(path, dependencies)
  writeFileSync(path, 'unexpected file')
  try {
    const result = run()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('unexpected installed file: node_modules')
  } finally {
    rmSync(path)
    renameSync(dependencies, path)
  }
})

it('does not import installed code when archive authentication fails', () => {
  const artifact = manifest.artifacts[0]
  const path = join(root, VENDOR_DIR, artifact.file)
  const original = readFileSync(path)
  const changed = Buffer.from(original)
  changed[4] ^= 1
  writeFileSync(path, changed)
  const restore = markEntry()
  try {
    rejectedBeforeImport(run(), 'sha256')
  } finally {
    writeFileSync(path, original)
    restore()
    rmSync(marker, { force: true })
  }
})
