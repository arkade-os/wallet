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
const INVOKERS = new Set(['node', 'pnpm', 'npm', 'corepack', 'bash', 'sh'])

/** The agent bootstrap, and the file whose `install` binding must name it. */
export const BOOTSTRAP = '.cursor/install.sh'
export const ENVIRONMENT = '.cursor/environment.json'

// A comment on the line IMMEDIATELY above the install it excuses. The ceiling is what is
// written, not a spare one: a marker no install needs is a bypass waiting to be moved.
export const OPT_OUT = 'carrier-artifacts: not a dependency install'
export const EXEMPT_INSTALLS = 0

// `pnpm/action-setup` installs with no command line at all when its step says so.
const ACTION_INSTALL = /^\s*run_install:\s*(?!false\b|'false'|"false")\S/

// Any spelling a drifting edit might reach for. `pnpm exec playwright install`
// matches too: an exemption is written with OPT_OUT, not guessed at here.
export function installsDependencies(line) {
  if (ACTION_INSTALL.test(line)) return true
  const tokens = line.trim().split(/\s+/)
  const at = tokens.findIndex((token) => PACKAGE_MANAGERS.has(token))
  if (at === -1) return false
  const rest = tokens.slice(at + 1)
  if (!rest.some((token) => !token.startsWith('-'))) return tokens[at] === 'yarn'
  return rest.some((token) => INSTALL_SUBCOMMANDS.has(token))
}

export const isOptOut = (line) => line !== undefined && isComment(line) && line.includes(OPT_OUT)

const commandBody = (line) =>
  line
    .replace(/^\s*(?:RUN|-)\s+/, '')
    .replace(/^\s*run:\s*/, '')
    .trim()

// A pipe reports its last stage and a bare `&` abandons the status; `;` and `&&` are read below.
const swallowsStatus = (command) => /[|&]/.test(command.replaceAll('&&', ' '))

const VERIFY_COMMAND = /carrier-artifacts\/verify\.mjs|verify:artifacts/

// Asking instead whether a prefix INSTALLED made `installsDependencies` a negative gate,
// where every miss it already had became a false green. Enumerate the provably harmless.
const BENIGN_PREFIX = /^(?:cd|set|export|mkdir|umask)\b|^corepack\s+(?:enable|prepare)\b/

// `echo …verify.mjs` names the command without running it, and only the last `;` group's
// status survives.
export const invokesVerify = (line) => {
  const command = commandBody(line)
  if (swallowsStatus(command)) return false
  const groups = command.split(';')
  const parts = groups.flatMap((group, index) =>
    group.split('&&').map((part) => ({ part: part.trim(), fatal: index === groups.length - 1 })),
  )
  const at = parts.findIndex(({ part }) => VERIFY_COMMAND.test(part) && INVOKERS.has(part.split(/\s+/)[0]))
  return at !== -1 && parts[at].fatal && parts.slice(0, at).every(({ part }) => BENIGN_PREFIX.test(part))
}

// Both are idiom on the dash line as well as under it.
const KEPT_FROM_RUNNING = /^\s*(?:-\s+)?if:\s/
const NON_FATAL = /^\s*(?:-\s+)?continue-on-error:\s*(?!false\b|'false'|"false")\S/
const JOB_DEFAULTS = /^ *defaults:/

// Actions' default `run` shell carries `-e`; a template or another interpreter drops it. The
// two named are the ones this scan can prove fatal; everything else disqualifies unenumerated.
// The value runs to a comma or brace so flow style reads the same as a block.
const shellValues = (line) =>
  [...line.matchAll(/shell:\s*([^,}]*)/g)].map((match) =>
    match[1]
      .replace(/#.*$/, '')
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2'),
  )
const unprovenShell = (line) => shellValues(line).some((value) => value !== 'bash' && value !== 'sh')

// Bash takes its short options combined, so every spelling carrying an `e` disarms. An ERR
// trap and a heredoc RUN do the same, until the next step or RUN opens an unrelaxed shell.
const RELAXES_SHELL =
  /^\s*set\s+\+(?:[a-zA-Z]*e|o\s+errexit\b)|^\s*shopt\s+-u\s+\S*errexit\b|^\s*trap\s.*\bERR\b|^\s*RUN\s.*<</
const OPENS_SHELL = /^\s*-\s|^\s*RUN\s/

// A command does not always run where it is written. Rather than sort the block kinds that
// propagate a failure from the ones that do not, no verify inside any of them counts.
const OPENS_BLOCK = /^\s*(?:if|while|until|for|case)\b|^\s*[A-Za-z_]\w*\s*\(\s*\)\s*\{/
const CLOSES_BLOCK = /^\s*(?:fi|done|esac|\})\s*;?\s*$/
const SAME_LINE_CLOSE = /\b(?:fi|done|esac)\s*;?\s*$|\}\s*;?\s*$/
const indentOf = (line) => /^\s*/.exec(line)[0].length

/** Indices whose verify must not count towards a later install. */
export function guardedLines(lines) {
  const guarded = new Set()
  const unsafeShell = lines.some((line) => unprovenShell(line))
  let start = 0
  let unitWide = false
  const close = (end) => {
    const dash = /^\s*-\s/.test(lines[start] ?? '') ? indentOf(lines[start]) : -1
    let guard = false
    lines.slice(start, end).forEach((line, offset) => {
      // A key no deeper than the dash above it is the job's, wherever the matrix put that
      // dash — and a job that continues on error holds no fatal step at all.
      const jobs = dash === -1 || (offset > 0 && indentOf(line) <= dash)
      // `defaults.run.shell` sits deeper than the job's own keys, so declaring `defaults:`
      // at all is what spreads an unproven shell across the job.
      if (JOB_DEFAULTS.test(line)) unitWide ||= jobs && unsafeShell
      else if (KEPT_FROM_RUNNING.test(line) || unprovenShell(line)) guard = true
      else if (!NON_FATAL.test(line)) return
      else if (jobs) unitWide = true
      else guard = true
    })
    if (guard) for (let index = start; index < end; index++) guarded.add(index)
  }
  lines.forEach((line, index) => {
    if (!/^\s*-\s/.test(line)) return
    close(index)
    start = index
  })
  close(lines.length)
  let relaxed = false
  let depth = 0
  lines.forEach((line, index) => {
    if (OPENS_SHELL.test(line)) {
      relaxed = false
      depth = 0
    }
    if (RELAXES_SHELL.test(line)) relaxed = true
    if (CLOSES_BLOCK.test(line)) depth = Math.max(0, depth - 1)
    else if (OPENS_BLOCK.test(line) && !SAME_LINE_CLOSE.test(line)) depth += 1
    if (relaxed || depth > 0) guarded.add(index)
  })
  if (unitWide) for (let index = 0; index < lines.length; index++) guarded.add(index)
  return guarded
}

// A command is a LOGICAL line. A Dockerfile continues one past a trailing backslash and a
// YAML folded scalar is one command across its whole block, so reading the physical line
// takes `…verify.mjs \` and `|| true` for two harmless halves. Fold first, then read.
const FOLDED_SCALAR = /^( *(?:-\s+)?)[A-Za-z_][\w-]*:\s*>[-+]?\d*[-+]?\s*(?:#.*)?$/

export function logicalLines(lines) {
  const folded = []
  let open
  let blockAt
  const close = () => {
    if (open) folded.push(open)
    open = undefined
  }
  const add = (index, line) => {
    const part = line.trim().replace(/\s*\\$/, '')
    if (open) {
      open.text += ` ${part}`
      open.span.push(index)
    } else open = { text: part, at: index, span: [index] }
  }
  lines.forEach((line, index) => {
    if (blockAt !== undefined) {
      if (line.trim() && indentOf(line) > blockAt) return add(index, line)
      close()
      blockAt = undefined
    }
    const scalar = FOLDED_SCALAR.exec(line)
    if (scalar) {
      close()
      folded.push({ text: line.trim(), at: index, span: [index] })
      blockAt = scalar[1].length
      return
    }
    add(index, line)
    if (!/\\$/.test(line.trim())) close()
  })
  close()
  return folded
}

/** A workflow-level `defaults:` sits outside `jobs:`, where the per-job scan cannot reach it. */
export function unprovenDefaultShell(yaml) {
  const lines = yaml.split(/\r?\n/)
  const start = lines.findIndex((line) => /^defaults:/.test(line))
  if (start === -1) return false
  if (unprovenShell(lines[start])) return true
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) continue
    if (/^\S/.test(line)) break
    if (unprovenShell(line)) return true
  }
  return false
}

/** 1-based line of the first install no executable verify precedes, or `undefined`. */
export function unverifiedInstall(lines) {
  const guarded = guardedLines(lines)
  let verified = false
  for (const { text, at, span } of logicalLines(lines)) {
    if (isComment(text)) continue
    if (invokesVerify(text)) verified ||= !span.some((index) => guarded.has(index))
    else if (installsDependencies(text) && !verified && !isOptOut(lines[at - 1])) return at + 1
  }
  return undefined
}

// A later stage is a fresh filesystem: the builder's verify never ran there and
// vendor/carrier was never copied, so a stage is the scan unit, not the file.
export function dockerfileStages(lines) {
  const stages = new Map()
  let stage
  lines.forEach((line, index) => {
    const from = !isComment(line) && /^\s*FROM\s+(\S+)(?:\s+AS\s+(\S+))?/i.exec(line)
    if (from) {
      stage = from[2] ?? from[1]
      stages.set(stages.has(stage) ? (stage = `${stage}#${index + 1}`) : stage, [])
    }
    if (stage) stages.get(stage).push(line)
  })
  return stages
}

// Headings take their indent from the first, so a four-space file reads the
// same and a nested key never passes for a job.
export function workflowJobs(yaml) {
  const jobs = new Map()
  let inJobs = false
  let indent
  let job
  for (const line of yaml.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      inJobs = /^jobs:\s*(?:#.*)?$/.test(line)
      indent = job = undefined
      continue
    }
    if (!inJobs) continue
    const heading = /^( +)([A-Za-z_][\w-]*):\s*(?:#.*)?$/.exec(line)
    if (heading && (indent === undefined || heading[1].length === indent)) {
      indent = heading[1].length
      jobs.set((job = heading[2]), [])
    }
    if (job) jobs.get(job).push(line)
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
