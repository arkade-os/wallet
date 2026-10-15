// Built-in Node only: the Docker verifier runs before dependencies are installed.

import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'

export const VENDOR_DIR = 'vendor/carrier'
export const MANIFEST_PATH = `${VENDOR_DIR}/manifest.json`

const TS_SDK = 'https://github.com/arkade-os/ts-sdk.git'
const ARKADE_TAXI = 'https://github.com/ArkLabsHQ/arkade-taxi.git'
const SDK_COMMIT = '3c369d3adb4fbcfd4e59f2650d0d439af49f432f'
const TAXI_COMMIT = 'f27ae4b6238569ff496d11a05faba32344b55245'

export const PINNED_SOURCES = {
  '@arkade-os/sdk': { repository: TS_SDK, commit: SDK_COMMIT, directory: 'packages/sdk' },
  '@arkade-os/swap': { repository: TS_SDK, commit: SDK_COMMIT, directory: 'packages/swap' },
  '@arkade-taxi/covenant': { repository: ARKADE_TAXI, commit: TAXI_COMMIT, directory: 'packages/covenant' },
  '@arkade-taxi/protocol': { repository: ARKADE_TAXI, commit: TAXI_COMMIT, directory: 'packages/protocol' },
  '@arkade-taxi/client': { repository: ARKADE_TAXI, commit: TAXI_COMMIT, directory: 'packages/client' },
}

export const PINNED_PACKAGES = Object.keys(PINNED_SOURCES)

export const PINNED_DIGESTS = {
  '@arkade-os/sdk': '05c566274a802ec414fc1f32329f4bcf5730406e5feb55cf4cfad5aca2befd48',
  '@arkade-os/swap': '3c1ce2f4ae4a9cd8a8b07154daa83f24a871d5b0b22611f8f4d6a764058b2b09',
  '@arkade-taxi/covenant': '8c9e70c792c5110b6f8b63e2f500004af8311e6f03b5aae3509b8b48a9db260b',
  '@arkade-taxi/protocol': 'd47edd6d09302725998dc4add79ac8bc60abcf625ca0a7ee69ca87d64809f0f4',
  '@arkade-taxi/client': 'fe8b2d8fe83e55e47ed798b50caa1c181a1d2da3fb31e95e82804d50ee8b21a3',
}

export const DIRECT_DEPENDENCIES = ['@arkade-os/sdk', '@arkade-os/swap', '@arkade-taxi/client']

export function pinnedSourceMismatch(artifact) {
  const pinned = PINNED_SOURCES[artifact?.package]
  const name = artifact?.file ?? 'an unnamed archive'
  if (!pinned) return `${name} records ${artifact?.package}, which is not a pinned package`
  for (const field of ['repository', 'commit', 'directory'])
    if (artifact.source?.[field] !== pinned[field])
      return `${name} records ${field} ${artifact.source?.[field]}, not the pinned ${pinned[field]}`
  return undefined
}

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

export const CANDIDATE_SWAP_SYMBOL = 'buildOfferFillPlan'
export const CANDIDATE_SDK_SYMBOL = 'SendDeadlineExceededError'
export const CANDIDATE_TAXI_SYMBOL = 'TaxiClaimQueue'
export const CANDIDATE_TAXI_FILL_SYMBOL = 'TaxiClient'

function* tarMembers(archivePath) {
  const buffer = gunzipSync(readFileSync(archivePath))
  let offset = 0
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '')
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '')
    const path = prefix ? `${prefix}/${name}` : name
    const size = Number.parseInt(header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim(), 8)
    offset += 512
    if (!Number.isSafeInteger(size) || size < 0 || offset + size > buffer.length)
      throw new Error(`${archivePath}: invalid tar member ${path}`)
    yield { path, bytes: buffer.subarray(offset, offset + size), type: header[156] }
    offset += Math.ceil(size / 512) * 512
  }
}

export function readTarMember(archivePath, member) {
  for (const { path, bytes } of tarMembers(archivePath)) if (path === member) return bytes.toString('utf8')
  return undefined
}

export function assertInstalledPackage(archivePath, packageRoot) {
  const members = new Map()
  for (const { path, bytes, type } of tarMembers(archivePath)) {
    const relative = path.slice('package/'.length)
    if (
      !path.startsWith('package/') ||
      relative.includes('\\') ||
      relative.split('/').some((part) => !part || part === '.' || part === '..') ||
      (type !== 0 && type !== 48) ||
      members.has(relative)
    )
      throw new Error(`${archivePath}: unsupported package member ${path}`)
    members.set(relative, bytes)
  }
  const inspect = (directory, prefix = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (
        !prefix &&
        entry.name === 'node_modules' &&
        (entry.isDirectory() || (entry.isSymbolicLink() && statSync(path).isDirectory()))
      )
        continue
      const relative = `${prefix}${entry.name}`
      if (entry.isDirectory()) inspect(path, `${relative}/`)
      else {
        if (!entry.isFile()) throw new Error(`${packageRoot}: installed file is not regular: ${relative}`)
        if (!members.has(relative)) throw new Error(`${packageRoot}: unexpected installed file: ${relative}`)
      }
    }
  }
  inspect(packageRoot)
  for (const [relative, bytes] of members) {
    const path = join(packageRoot, relative)
    if (!existsSync(path) || !lstatSync(path).isFile())
      throw new Error(`${packageRoot}: installed file is not regular: ${relative}`)
    if (!readFileSync(path).equals(bytes)) throw new Error(`${packageRoot}: installed bytes differ: ${relative}`)
  }
}

export function assertInstalledPackages(fromFiles, artifacts, vendorRoot) {
  const byName = new Map(artifacts.map((artifact) => [artifact.package, artifact]))
  const pending = []
  const seen = new Set()
  const enqueue = (from) => {
    const manifest = readJson(from)
    for (const name of Object.keys({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    }))
      if (byName.has(name)) pending.push([from, name])
  }
  for (const from of fromFiles) enqueue(from)
  while (pending.length) {
    const [from, name] = pending.pop()
    const root = packageRootFrom(from, name)
    if (seen.has(root)) continue
    assertInstalledPackage(join(vendorRoot, byName.get(name).file), root)
    seen.add(root)
    enqueue(join(root, 'package.json'))
  }
}

export const archiveManifest = (archivePath) => {
  const source = readTarMember(archivePath, 'package/package.json')
  if (source === undefined) throw new Error(`${archivePath}: archive carries no package/package.json`)
  return JSON.parse(source)
}

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

export function licenseOf(manifest, sourceRoot) {
  if (manifest.license) return manifest.license
  const headline = readFileSync(join(sourceRoot, 'LICENSE'), 'utf8')
    .split(/\r?\n/)
    .find((line) => line.trim())
  if (!headline?.includes('MIT')) throw new Error(`${sourceRoot}/LICENSE is not the MIT text this manifest would claim`)
  return 'MIT'
}

export const fileSpec = (from, filename) => `file:${from}${from.endsWith('/') ? '' : '/'}${filename}`

export function readFlatMapping(yaml, key) {
  const lines = yaml.split(/\r?\n/)
  const start = lines.findIndex((line) => line === `${key}:`)
  if (start === -1) return undefined
  const mapping = {}
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) continue
    if (!line.startsWith(' ')) break
    if (/^\s*#/.test(line)) continue
    const pair = /^ {2}(?:'([^']+)'|([^\s:'][^:]*)):\s+(?:'([^']*)'|(\S.*?))\s*$/.exec(line)
    if (!pair) throw new Error(`${key} contains a line this reader will not interpret: ${line}`)
    mapping[pair[1] ?? pair[2]] = pair[3] ?? pair[4]
  }
  return mapping
}

const isPresent = (dir, name) => {
  let path = dir
  for (const level of ['', ...name.split('/')]) {
    path = join(path, level)
    try {
      if (lstatSync(path).isFile()) return true
    } catch (error) {
      if (error?.code === 'ENOENT') return false
      throw error
    }
  }
  return true
}

export function resolveInstalled(fromFile, name) {
  const require = createRequire(fromFile)
  try {
    return require.resolve(name)
  } catch (error) {
    const present = (require.resolve.paths(name) ?? []).some((dir) => isPresent(dir, name))
    if (error?.code === 'MODULE_NOT_FOUND' && !present) return undefined
    throw new Error(`${name} is installed but does not resolve from ${fromFile}: ${error.message}`)
  }
}

export function packageRootFrom(fromFile, name) {
  let directory = dirname(createRequire(realpathSync(fromFile)).resolve(name))
  for (;;) {
    const manifest = join(directory, 'package.json')
    if (existsSync(manifest) && readJson(manifest).name === name) return directory
    const parent = dirname(directory)
    if (parent === directory) throw new Error(`${name} is not resolvable from ${fromFile}`)
    directory = parent
  }
}

export async function assertCandidateExport(packageRoot, name, symbol, subpath = '.', requiredMethod) {
  const manifest = readJson(join(packageRoot, 'package.json'))
  const exported = manifest.exports?.[subpath]
  const entry =
    exported?.import?.default ??
    exported?.import ??
    exported?.default ??
    (subpath === '.' ? (manifest.module ?? manifest.main) : undefined)
  if (!entry)
    throw new Error(`${name}${subpath === '.' ? '' : subpath.slice(1)} at ${packageRoot} declares no ESM entry`)
  const namespace = await import(pathToFileURL(join(packageRoot, entry)).href)
  if (!(symbol in namespace))
    throw new Error(`${name} resolved to ${packageRoot}, which does not export ${symbol}: that is not the candidate`)
  if (requiredMethod && typeof namespace[symbol]?.prototype?.[requiredMethod] !== 'function')
    throw new Error(`${name} resolved to ${packageRoot}, which has no callable ${symbol}.${requiredMethod}`)
  return packageRoot
}
