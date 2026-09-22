// Built-in Node only: `verify.mjs` runs in the Docker layer BEFORE
// `pnpm install`, so there is no node_modules for it to import from.

import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'

export const VENDOR_DIR = 'vendor/carrier'
export const MANIFEST_PATH = `${VENDOR_DIR}/manifest.json`

const TS_SDK = 'https://github.com/arkade-os/ts-sdk.git'
const ARKADE_TAXI = 'https://github.com/ArkLabsHQ/arkade-taxi.git'
const SDK_COMMIT = 'adc6b32958c36a7f9c39d6e30efdd945af874f84'
const TAXI_COMMIT = '4109312c56744e967fe9fa235d9e0620447d2908'

// Moving to a new candidate is an edit HERE, so `verify.mjs` can refuse an
// archive whose manifest names any other commit.
export const PINNED_SOURCES = {
  '@arkade-os/sdk': { repository: TS_SDK, commit: SDK_COMMIT, directory: 'packages/ts-sdk' },
  '@arkade-os/swap': { repository: TS_SDK, commit: SDK_COMMIT, directory: 'packages/swap' },
  '@arkade-taxi/covenant': { repository: ARKADE_TAXI, commit: TAXI_COMMIT, directory: 'packages/covenant' },
  '@arkade-taxi/protocol': { repository: ARKADE_TAXI, commit: TAXI_COMMIT, directory: 'packages/protocol' },
  '@arkade-taxi/client': { repository: ARKADE_TAXI, commit: TAXI_COMMIT, directory: 'packages/client' },
}

export const PINNED_PACKAGES = Object.keys(PINNED_SOURCES)

/** Frozen packages the wallet declares directly, rather than reaching transitively. */
export const DIRECT_DEPENDENCIES = ['@arkade-os/sdk', '@arkade-os/swap', '@arkade-taxi/client']

/** Why this archive is not the pinned source, or `undefined` when it is. */
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

// What separates each candidate from the REGISTRY build: both symbols were added
// in `adc6b329` and neither published build of any version exports one.
export const CANDIDATE_SWAP_SYMBOL = 'FundingOutputMismatchError'
export const CANDIDATE_SDK_SYMBOL = 'SendDeadlineExceededError'

// A gzipped tar without a tar dependency: decode the POSIX ustar fields, skip the rest by size.
export function readTarMember(archivePath, member) {
  const buffer = gunzipSync(readFileSync(archivePath))
  let offset = 0
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '')
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '')
    const path = prefix ? `${prefix}/${name}` : name
    const size = Number.parseInt(header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim(), 8) || 0
    offset += 512
    if (path === member) return buffer.subarray(offset, offset + size).toString('utf8')
    offset += Math.ceil(size / 512) * 512
  }
  return undefined
}

export const archiveManifest = (archivePath) => {
  const source = readTarMember(archivePath, 'package/package.json')
  if (source === undefined) throw new Error(`${archivePath}: archive carries no package/package.json`)
  return JSON.parse(source)
}

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

export const isComment = (line) => /^\s*#/.test(line)

const PACKAGE_MANAGERS = new Set(['pnpm', 'npm', 'yarn', 'bun'])
const INSTALL_SUBCOMMANDS = new Set(['install', 'i', 'ci', 'add'])
const NOT_AN_INSTALL = new Set(['exec', 'run', 'dlx', 'create', 'x'])

// Any spelling a drifting edit might reach for — `pnpm i`, `npm ci`, bare
// `yarn` — while `pnpm exec playwright install` is not one of them.
export function installsDependencies(line) {
  const tokens = line.trim().split(/\s+/)
  const at = tokens.findIndex((token) => PACKAGE_MANAGERS.has(token))
  if (at === -1) return false
  const rest = tokens.slice(at + 1)
  const subcommand = rest.find((token) => !token.startsWith('-'))
  if (subcommand === undefined) return tokens[at] === 'yarn'
  return !NOT_AN_INSTALL.has(subcommand) && rest.some((token) => INSTALL_SUBCOMMANDS.has(token))
}

/** 1-based line of the first install this command does not precede, or `undefined`. */
export function unverifiedInstall(lines) {
  let verified = false
  for (const [index, line] of lines.entries()) {
    if (isComment(line)) continue
    if (/carrier-artifacts\/verify\.mjs/.test(line)) verified = true
    else if (!verified && installsDependencies(line)) return index + 1
  }
  return undefined
}

/** Each job of a workflow, by name, as the lines beneath its heading. */
export function workflowJobs(yaml) {
  const jobs = new Map()
  let inJobs = false
  let job
  for (const line of yaml.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      inJobs = line.trimEnd() === 'jobs:'
      job = undefined
    } else if (inJobs) {
      const heading = /^ {2}([A-Za-z_][\w-]*):\s*$/.exec(line)
      if (heading) jobs.set((job = heading[1]), [])
      if (job) jobs.get(job).push(line)
    }
  }
  return jobs
}

// An override resolves against the workspace root, a dependency against the
// declaring directory, so callers pass the one they write in.
export const fileSpec = (from, filename) => `file:${from}${from.endsWith('/') ? '' : '/'}${filename}`

// A YAML dependency cannot reach a pre-install Docker layer, so read the one
// flat block by hand and fail closed on anything but a `name: spec` pair.
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

// Under pnpm's strict layout only the importer's own question is the real one.
export function packageRootFrom(fromFile, name) {
  // realpath: pnpm links packages into `.pnpm/`, and deps are siblings THERE.
  let directory = dirname(createRequire(realpathSync(fromFile)).resolve(name))
  for (;;) {
    const manifest = join(directory, 'package.json')
    if (existsSync(manifest) && readJson(manifest).name === name) return directory
    const parent = dirname(directory)
    if (parent === directory) throw new Error(`${name} is not resolvable from ${fromFile}`)
    directory = parent
  }
}

// Load what actually resolved and require the named export. An import that
// merely succeeds does not separate a candidate from the registry build.
export async function assertCandidateExport(packageRoot, name, symbol) {
  const manifest = readJson(join(packageRoot, 'package.json'))
  const entry = manifest.exports?.['.']?.import?.default ?? manifest.module ?? manifest.main
  if (!entry) throw new Error(`${name} at ${packageRoot} declares no ESM entry`)
  const namespace = await import(pathToFileURL(join(packageRoot, entry)).href)
  if (!(symbol in namespace))
    throw new Error(`${name} resolved to ${packageRoot}, which does not export ${symbol}: that is not the candidate`)
  return packageRoot
}
