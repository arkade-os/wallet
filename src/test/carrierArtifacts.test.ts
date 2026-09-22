// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  CANDIDATE_SDK_SYMBOL,
  CANDIDATE_SWAP_SYMBOL,
  DIRECT_DEPENDENCIES,
  MANIFEST_PATH,
  PINNED_PACKAGES,
  installsDependencies,
  packageRootFrom,
  pinnedSourceMismatch,
  unverifiedInstall,
  workflowJobs,
  type CarrierArtifact,
  type CarrierManifest,
} from '../../scripts/carrier-artifacts/lib.mjs'

const REPO = fileURLToPath(new URL('../../', import.meta.url))
const manifest = JSON.parse(readFileSync(join(REPO, MANIFEST_PATH), 'utf8')) as CarrierManifest
const require = createRequire(join(REPO, 'package.json'))

// Both versions exist on the registry too, built from different source, so an
// install can take the wrong bytes and still import cleanly. No published build
// of any version exports either symbol.
const CANDIDATE_ONLY = {
  '@arkade-os/sdk': 'SendDeadlineExceededError',
  '@arkade-os/swap': 'FundingOutputMismatchError',
} as const

describe('carrier artifacts', () => {
  it('pass the built-in-Node verification command, with its repository checks run', () => {
    let output = ''
    try {
      output = execFileSync(process.execPath, [join(REPO, 'scripts', 'carrier-artifacts', 'verify.mjs')], {
        cwd: REPO,
        encoding: 'utf8',
      })
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string }
      expect.fail(`${failure.stderr ?? ''}${failure.stdout ?? ''}`)
    }
    expect(output, 'the Dockerfile and workflow checks skip themselves outside a whole checkout').toContain(
      'Dockerfile and workflows checked',
    )
    expect(output).toContain('candidate exports confirmed in the installed tree')
  })

  it('record a reproducible source for every frozen archive', () => {
    expect(manifest.artifacts.map((artifact) => artifact.package).sort()).toEqual([...PINNED_PACKAGES].sort())
    for (const artifact of manifest.artifacts) {
      expect(artifact.source.commit, artifact.file).toMatch(/^[0-9a-f]{40}$/)
      expect(artifact.source.repository, artifact.file).toMatch(/^https:\/\//)
      expect(artifact.source.directory, artifact.file).toMatch(/^packages\//)
      expect(artifact.license, artifact.file).toBeTruthy()
      expect(artifact.toolchain.node, artifact.file).toMatch(/^v\d+\./)
      expect(artifact.file, 'the source commit belongs in the filename, not only in a semver').toContain(
        artifact.source.commit.slice(0, 8),
      )
    }
  })

  // A well-formed commit that is not the PINNED one is the mismatch class a
  // shape check cannot see, and what a wrong-tree pack looks like.
  it('refuse an archive whose manifest names anything but the pinned source', () => {
    expect(manifest.artifacts).toHaveLength(PINNED_PACKAGES.length)
    for (const artifact of manifest.artifacts) {
      expect(pinnedSourceMismatch(artifact), artifact.file).toBeUndefined()
      const wrong = (source: Partial<CarrierArtifact['source']>) =>
        pinnedSourceMismatch({ ...artifact, source: { ...artifact.source, ...source } })
      expect(wrong({ commit: 'f'.repeat(40) })).toContain('not the pinned')
      expect(wrong({ directory: 'packages/somewhere-else' })).toContain('not the pinned')
      expect(wrong({ repository: 'https://example.invalid/fork.git' })).toContain('not the pinned')
      expect(pinnedSourceMismatch({ ...artifact, package: '@arkade-os/unpinned' })).toContain('not a pinned package')
    }
  })

  it.each(Object.entries(CANDIDATE_ONLY))(
    '%s resolves to the candidate build, not the registry one',
    async (name, symbol) => {
      expect({ '@arkade-os/sdk': CANDIDATE_SDK_SYMBOL, '@arkade-os/swap': CANDIDATE_SWAP_SYMBOL }[name]).toBe(symbol)
      // The packed Taxi client asks for the registry coordinate and must not get it.
      for (const from of [join(REPO, 'package.json'), require.resolve('@arkade-taxi/client')]) {
        const root = packageRootFrom(from, name)
        const entry = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { module?: string }).module
        const namespace = (await import(pathToFileURL(join(root, entry ?? 'dist/index.js')).href)) as object
        expect(Object.keys(namespace), `${name} as resolved from ${from}`).toContain(symbol)
      }
    },
  )

  // Both were live blind spots: a commented-out step and a `pnpm i` rewrite each reported a clean job.
  it.each([
    ['pnpm install', true],
    ['      run: pnpm i', true],
    ['npm ci', true],
    ['RUN corepack pnpm install --frozen-lockfile', true],
    ['pnpm --filter app install', true],
    ['yarn', true],
    ['pnpm exec playwright install chrome --with-deps', false],
    ['pnpm run test:unit', false],
    ['pnpm build:worker && npx vite build', false],
    ['node scripts/carrier-artifacts/verify.mjs', false],
  ])('read %j as an install: %s', (line, expected) => {
    expect(installsDependencies(line as string)).toBe(expected)
  })

  it('require a verify that is neither commented out nor after the install', () => {
    const verify = '  run: node scripts/carrier-artifacts/verify.mjs'
    expect(unverifiedInstall([verify, '  run: pnpm install'])).toBeUndefined()
    expect(unverifiedInstall(['  run: pnpm install'])).toBe(1)
    expect(unverifiedInstall([`  # ${verify.trim()}`, '  run: pnpm i'])).toBe(2)
    expect(unverifiedInstall(['  run: pnpm install', verify])).toBe(1)
    expect(unverifiedInstall(['  run: pnpm exec playwright install chrome'])).toBeUndefined()
    expect(unverifiedInstall([]), 'a path that installs nothing needs no verify').toBeUndefined()
  })

  it('attribute workflow lines to real jobs, not to on: triggers', () => {
    const jobs = workflowJobs(readFileSync(join(REPO, '.github', 'workflows', 'ci.yml'), 'utf8'))
    expect([...jobs.keys()]).toEqual(['test'])
    expect(jobs.get('test')?.some((line) => installsDependencies(line))).toBe(true)
  })

  it('make the frozen packages resolvable from the wallet', async () => {
    for (const name of DIRECT_DEPENDENCIES) expect(() => require.resolve(name)).not.toThrow()
    const client = (await import(pathToFileURL(require.resolve('@arkade-taxi/client')).href)) as object
    expect(Object.keys(client)).toEqual(
      expect.arrayContaining([
        'TaxiClient',
        'assertSameUnsignedTx',
        'buildOfferFillPlan',
        'signJointGraphForOwner',
        'unsignedPsbtBytes',
        'verifyOfferFillPlan',
        'verifyReceiveQuote',
        'verifySwapFillQuote',
      ]),
    )
  })
})
