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
let client
let clientEntry
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
  const original = readFileSync(clientEntry)
  writeFileSync(
    clientEntry,
    Buffer.concat([
      original,
      Buffer.from(
        `\nimport { writeFileSync as payloadMarker } from 'node:fs'; payloadMarker(${JSON.stringify(marker)}, 'executed');\n`,
      ),
    ]),
  )
  return () => writeFileSync(clientEntry, original)
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
  for (const name of ['@scure/btc-signer', '@arkade-os/sdk', '@arkade-os/swap'])
    if (!existsSync(join(root, 'node_modules', name)))
      link(packageRootFrom(join(repo, 'package.json'), name), join(root, 'node_modules', name))
  if (existsSync(join(root, 'packages/solver-app/package.json')))
    link(join(root, 'node_modules'), join(root, 'packages/solver-app/node_modules'))
  // Only the extracted Taxi client is the fixture's own copy; the npm packages link into the real install.
  client = join(root, 'node_modules/@arkade-taxi/client')
  const declared = JSON.parse(readFileSync(join(client, 'package.json'), 'utf8'))
  clientEntry = join(client, declared.exports['.'].default)
  marker = join(root, 'imported-marker')
})

afterAll(() => {
  if (root) removeFixture(root)
})

it('accepts an unchanged installation extracted from the frozen archives', () => {
  const result = run()
  expect(result.status, result.stderr).toBe(0)
})

it('requires every Taxi archive in the manifest before importing installed packages', () => {
  const restoreEntry = markEntry()
  const path = join(root, MANIFEST_PATH)
  const original = readFileSync(path, 'utf8')
  const incomplete = JSON.parse(original)
  incomplete.artifacts = incomplete.artifacts.filter(({ package: name }) => name !== '@arkade-taxi/protocol')
  writeFileSync(path, JSON.stringify(incomplete))
  try {
    rejectedBeforeImport(run(), 'expected exactly @arkade-taxi/covenant, @arkade-taxi/protocol, @arkade-taxi/client')
  } finally {
    writeFileSync(path, original)
    restoreEntry()
    rmSync(marker, { force: true })
  }
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

it('refuses a second SDK installation resolved through a Taxi dependency', () => {
  const path = join(client, 'node_modules/@arkade-os/sdk')
  const installed = packageRootFrom(join(repo, 'package.json'), '@arkade-os/sdk')
  const declared = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'))
  rmSync(path)
  mkdirSync(path)
  copyFileSync(join(installed, 'package.json'), join(path, 'package.json'))
  const payload = `writeFileSync(${JSON.stringify(marker)}, 'executed')`
  for (const [entry, source] of [
    [declared.exports['.'].import.default, `import { writeFileSync } from 'node:fs'; ${payload}`],
    [declared.exports['.'].require.default, `const { writeFileSync } = require('node:fs'); ${payload}`],
  ]) {
    mkdirSync(dirname(join(path, entry)), { recursive: true })
    writeFileSync(join(path, entry), source)
  }
  try {
    rejectedBeforeImport(run(), '@arkade-taxi/client resolves a different SDK installation')
  } finally {
    removeFixture(path)
    link(installed, path)
    rmSync(marker, { force: true })
  }
})

it('rejects package files absent from the archive', () => {
  const path = join(client, 'dist/extra.js')
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
  const path = join(client, 'linked-payload')
  link(join(client, 'dist'), path)
  try {
    const result = run()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('installed file is not regular')
  } finally {
    rmSync(path)
  }
})

it('rejects a regular package file named node_modules', () => {
  const path = join(client, 'node_modules')
  const dependencies = join(root, 'client-dependencies')
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
