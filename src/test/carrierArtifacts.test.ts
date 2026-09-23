// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  BOOTSTRAP,
  CANDIDATE_SDK_SYMBOL,
  CANDIDATE_SWAP_SYMBOL,
  DIRECT_DEPENDENCIES,
  ENVIRONMENT,
  EXEMPT_INSTALLS,
  MANIFEST_PATH,
  OPT_OUT,
  PINNED_PACKAGES,
  dockerfileStages,
  installsDependencies,
  invokesVerify,
  isComment,
  isOptOut,
  packageRootFrom,
  pinnedSourceMismatch,
  unverifiedInstall,
  workflowJobs,
  type CarrierArtifact,
  type CarrierManifest,
} from '../../scripts/carrier-artifacts/lib.mjs'
// Namespace-imported so reverting lib.mjs reproduces the behavioural RED instead of a link error.
import * as carrier from '../../scripts/carrier-artifacts/lib.mjs'

const REPO = fileURLToPath(new URL('../../', import.meta.url))
const BS = String.fromCharCode(92)
const manifest = JSON.parse(readFileSync(join(REPO, MANIFEST_PATH), 'utf8')) as CarrierManifest
const require = createRequire(join(REPO, 'package.json'))
const rows = (text: string) => text.split(/\r?\n/)
const indentJobs = (yaml: string) =>
  rows(yaml)
    .map((line, index, all) => (index > all.indexOf('jobs:') && line.trim() ? `  ${line}` : line))
    .join('\n')

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
      'Dockerfile, workflows and bootstrap binding checked',
    )
    expect(output).toContain('candidate exports confirmed in the installed tree')
  })

  // The pre-install context the Docker layer copies, staged where an install can be broken on purpose.
  const stageInstallContext = (install?: (client: string, root: string) => void) => {
    const root = mkdtempSync(join(tmpdir(), 'carrier-verify-'))
    for (const path of [
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'vendor/carrier',
      'scripts/carrier-artifacts',
    ])
      cpSync(join(REPO, path), join(root, path), { recursive: true })
    install?.(join(root, 'node_modules', '@arkade-taxi', 'client'), root)
    return root
  }
  const verifyIn = (root: string) =>
    spawnSync(process.execPath, [join(root, 'scripts', 'carrier-artifacts', 'verify.mjs')], {
      cwd: root,
      encoding: 'utf8',
    })
  const clientManifest = (client: string, manifest: object) => {
    mkdirSync(client, { recursive: true })
    writeFileSync(join(client, 'package.json'), JSON.stringify({ name: '@arkade-taxi/client', ...manifest }))
  }

  it('pass a context with nothing installed, as the Docker layer is', () => {
    const root = stageInstallContext()
    try {
      const run = verifyIn(root)
      expect(run.status, run.stderr).toBe(0)
      expect(run.stdout).toContain('no install to inspect yet')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it.each([
    [
      'exports only an import condition',
      (client: string) => clientManifest(client, { type: 'module', exports: { '.': { import: './index.js' } } }),
    ],
    ['names a main that is not there', (client: string) => clientManifest(client, { main: './dist/index.js' })],
    [
      'is a link whose target is gone',
      (client: string, root: string) => {
        const target = join(root, 'gone')
        mkdirSync(target)
        mkdirSync(dirname(client), { recursive: true })
        symlinkSync(target, client, 'junction')
        rmSync(target, { recursive: true })
      },
    ],
  ])('fail an installed client that %s, rather than skip it', (_case, install) => {
    const root = stageInstallContext(install)
    try {
      const run = verifyIn(root)
      expect(run.status, run.stdout).toBe(1)
      expect(run.stderr).toContain('@arkade-taxi/client is installed but does not resolve')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
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

  it('read a repository LICENSE only for a package that names no license of its own', () => {
    const root = mkdtempSync(join(tmpdir(), 'carrier-license-'))
    try {
      writeFileSync(join(root, 'LICENSE'), 'Apache License\nVersion 2.0\n')
      expect(carrier.licenseOf({ license: 'MIT' }, root)).toBe('MIT')
      expect(() => carrier.licenseOf({}, root)).toThrow('is not the MIT text')
      writeFileSync(join(root, 'LICENSE'), '\nMIT License\n\nCopyright (c) 2026 Ark Labs\n')
      expect(carrier.licenseOf({}, root)).toBe('MIT')
    } finally {
      rmSync(root, { recursive: true, force: true })
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

  // Every install is suspect; only the written OPT_OUT marker excuses one.
  it.each([
    ['pnpm install', true],
    ['      run: pnpm i', true],
    ['npm ci', true],
    ['RUN corepack pnpm install --frozen-lockfile', true],
    ['pnpm --filter app install', true],
    ['yarn', true],
    ['pnpm exec playwright install chrome --with-deps', true],
    ['pnpm run test:unit', false],
    ['pnpm build:worker && npx vite build', false],
    ['nvm install', false],
    ['node scripts/carrier-artifacts/verify.mjs', false],
    ['        run_install: true', true],
    ['        run_install: |', true],
    ['        run_install: false', false],
    ['      uses: pnpm/action-setup@v4', false],
    ['RUN pnpm install; echo ok', true],
    ['      run: sh -c "pnpm install"', true],
    ['pnpm i&&pnpm build', true],
    ['pnpm install>/dev/null', true],
    ['`npm ci`', true],
    ['yarn; pnpm build', true],
    ['yarn 2>&1', true],
    ['echo "use npm"; yarn', true],
    ['yarn build', false],
    ['        echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV', false],
  ])('read %j as an install: %s', (line, expected) => {
    expect(installsDependencies(line as string)).toBe(expected)
  })

  it.each([['RUN pnpm install; echo ok'], ['      run: sh -c "pnpm install"'], ['RUN pnpm i&&pnpm build']])(
    'hold %j to a verify, however the shell punctuates it',
    (line) => {
      expect(unverifiedInstall([line])).toBe(1)
    },
  )

  // A step that only names the command does not run it, nor does one the shell absolves.
  it.each([
    ['      run: node scripts/carrier-artifacts/verify.mjs', true],
    ['RUN node scripts/carrier-artifacts/verify.mjs', true],
    ['    - run: pnpm verify:artifacts', true],
    ['RUN node scripts/carrier-artifacts/verify.mjs && pnpm install', true],
    ['      run: echo node scripts/carrier-artifacts/verify.mjs', false],
    ['        echo "see scripts/carrier-artifacts/verify.mjs"', false],
    ['      run: pnpm install', false],
    ['RUN pnpm verify:artifacts || true', false],
    ['RUN pnpm verify:artifacts ; true', false],
    ['RUN pnpm verify:artifacts | tee verify.log', false],
    ['RUN node scripts/carrier-artifacts/verify.mjs &', false],
    ['RUN pnpm install && pnpm verify:artifacts', false],
  ])('read %j as running the verification: %s', (line, expected) => {
    expect(invokesVerify(line as string)).toBe(expected)
  })

  it('require a verify that is neither commented out, conditional, nor after the install', () => {
    const verify = '      run: node scripts/carrier-artifacts/verify.mjs'
    expect(unverifiedInstall([verify, '      run: pnpm install'])).toBeUndefined()
    expect(unverifiedInstall(['      run: pnpm install'])).toBe(1)
    expect(unverifiedInstall([`      # ${verify.trim()}`, '      run: pnpm i'])).toBe(2)
    expect(unverifiedInstall(['      run: pnpm install', verify])).toBe(1)
    expect(unverifiedInstall([verify.replace('node', 'echo node'), '      run: pnpm i'])).toBe(2)
    expect(unverifiedInstall(['    - name: v', '      if: false', verify, '      run: pnpm i'])).toBe(4)
    expect(unverifiedInstall(['    - name: v', verify, '    - run: pnpm i'])).toBeUndefined()
    expect(unverifiedInstall([`    # ${OPT_OUT}`, '      run: pnpm exec playwright install chrome'])).toBeUndefined()
    expect(unverifiedInstall([`    # ${OPT_OUT}`, '      run: pnpm i', '      run: pnpm i'])).toBe(3)
    expect(unverifiedInstall([]), 'a path that installs nothing needs no verify').toBeUndefined()
  })

  // Presence and order were all this scan ever asked, so a gate that cannot fail passed it.
  it.each([
    ['a step guarded on the dash line', ['- if: false', '  run: pnpm verify:artifacts', '- run: pnpm i'], 3],
    [
      'a step told to continue on error',
      ['- name: gate', '  continue-on-error: true', '  run: pnpm verify:artifacts', '- run: pnpm i'],
      4,
    ],
    [
      'the same written on the dash line',
      ["- continue-on-error: 'true'", '  run: pnpm verify:artifacts', '- run: pnpm i'],
      3,
    ],
    [
      'a whole job told to continue on error',
      ['    continue-on-error: true', '    steps:', '    - run: pnpm verify:artifacts', '    - run: pnpm i'],
      4,
    ],
    // playwright.yml's own shape: its matrix puts list items above `steps:`.
    [
      'a job told to continue on error below its matrix',
      [
        '    strategy:',
        '      matrix:',
        '        include:',
        '          - group: core',
        '    continue-on-error: true',
        '    steps:',
        '    - run: pnpm verify:artifacts',
        '    - run: pnpm i',
      ],
      8,
    ],
    [
      'an expression this scan cannot read as false',
      ["- continue-on-error: ${{ github.event_name == 'push' }}", '  run: pnpm verify:artifacts', '- run: pnpm i'],
      3,
    ],
    ['a shell that swallows it', ['RUN pnpm verify:artifacts || true', 'RUN pnpm i'], 2],
    ['a semicolon that swallows it', ['RUN pnpm verify:artifacts ; true', 'RUN pnpm i'], 2],
    ['a no-op that swallows it', ['RUN pnpm verify:artifacts || :', 'RUN pnpm i'], 2],
    ['a pipe, which reports only its last stage', ['RUN pnpm verify:artifacts | tee v', 'RUN pnpm i'], 2],
    ['a background verify nothing waits on', ['RUN pnpm verify:artifacts &', 'RUN pnpm i'], 2],
    ['an install chained ahead of it', ['RUN pnpm i && pnpm verify:artifacts'], 1],
  ])('count no verify whose failure is not fatal: %s', (_case, source, expected) => {
    expect(unverifiedInstall(source as string[])).toBe(expected)
  })

  // The thing holding an exit status is a logical command, and both files already span lines.
  it.each([
    ['a continuation carrying the swallow', [`RUN pnpm verify:artifacts ${BS}`, '    || true', 'RUN pnpm i'], 3],
    [
      'a folded scalar carrying it',
      ['      run: >-', '        pnpm verify:artifacts', '        || true', '      run: pnpm i'],
      4,
    ],
    [
      'the same folded scalar opened on the dash line',
      ['    - run: >-', '        pnpm verify:artifacts', '        || true', '    - run: pnpm i'],
      4,
    ],
    [
      'a continuation inside a block scalar',
      ['      run: |', `        pnpm verify:artifacts ${BS}`, '          || true', '      run: pnpm i'],
      4,
    ],
    ['set +e above it', ['      run: |', '        set +e', '        pnpm verify:artifacts', '      run: pnpm i'], 4],
    [
      'an ERR trap above it',
      ['      run: |', "        trap 'exit 0' ERR", '        pnpm verify:artifacts', '      run: pnpm i'],
      4,
    ],
    [
      'a shell template, which drops the -e Actions adds',
      ['    - shell: bash {0}', '      run: pnpm verify:artifacts', '    - run: pnpm i'],
      3,
    ],
    [
      'an interpreter this scan cannot vouch for',
      ['    - shell: pwsh', '      run: pnpm verify:artifacts', '    - run: pnpm i'],
      3,
    ],
    [
      'a job defaulting every step to such a shell',
      [
        '    defaults:',
        '      run:',
        '        shell: bash {0}',
        '    steps:',
        '    - run: pnpm verify:artifacts',
        '    - run: pnpm i',
      ],
      6,
    ],
    [
      'a heredoc RUN, which reports only its last command',
      ['RUN <<EOF', 'pnpm verify:artifacts', 'echo done', 'EOF', 'RUN pnpm i'],
      5,
    ],
    [
      'a folded scalar whose indicators are written the other way round',
      ['      run: >2-', '        pnpm verify:artifacts', '        || true', '      run: pnpm i'],
      4,
    ],
    [
      'a job defaulting to such a shell in flow style',
      ['    defaults: {run: {shell: pwsh}}', '    steps:', '    - run: pnpm verify:artifacts', '    - run: pnpm i'],
      4,
    ],
  ])('count no verify the shell can still absolve: %s', (_case, source, expected) => {
    expect(unverifiedInstall(source as string[])).toBe(expected)
  })

  it.each([
    ['set +e', 4],
    ['set +e -x', 4],
    ['set +o errexit', 4],
    ['set +eo pipefail', 4],
    ['set +ex', 4],
    ['set +eu', 4],
    ['set +xe', 4],
    ['shopt -u inherit_errexit', 4],
    ['shopt -o -u errexit', 4],
    ['shopt -ou errexit', 4],
    ['shopt -u -o errexit', 4],
    ['shopt -s inherit_errexit', undefined],
    ['set +o pipefail', undefined],
    ['set +u', undefined],
    ['set -eo pipefail', undefined],
  ])('read %j as disarming the shell: line %s', (line, expected) => {
    const source = ['      run: |', `        ${line as string}`, '        pnpm verify:artifacts', '      run: pnpm i']
    expect(unverifiedInstall(source)).toBe(expected)
  })

  it.each([
    ['sh -c "pnpm install"', 1],
    ['make deps', 2],
    ['pnpm fetch', 2],
    ['. ./setup.sh', 2],
    ['source ./setup.sh', 2],
    ['bash ./setup.sh', 2],
    ['export X=$(pnpm install)', 1],
    ['cd $(pnpm install)', 1],
    ['cd /app', undefined],
    ['corepack enable', undefined],
    ['export CI=1', undefined],
    ['mkdir -p /app', undefined],
    ['set -e', undefined],
  ])('count a verify chained behind %j: line %s', (prefix, expected) => {
    expect(unverifiedInstall([`RUN ${prefix as string} && pnpm verify:artifacts`, 'RUN pnpm i'])).toBe(expected)
  })

  it.each([
    [
      'an if condition, which errexit exempts',
      [
        '      run: |',
        '        if',
        '          pnpm verify:artifacts',
        '        then',
        '          echo ok',
        '        fi',
        '      run: pnpm i',
      ],
      7,
    ],
    [
      'a function body whose caller swallows it',
      [
        '      run: |',
        '        gate() {',
        '          pnpm verify:artifacts',
        '        }',
        '        gate || true',
        '      run: pnpm i',
      ],
      6,
    ],
    [
      'a branch that never runs',
      [
        '      run: |',
        '        if true; then echo skip; else',
        '          pnpm verify:artifacts',
        '        fi',
        '      run: pnpm i',
      ],
      5,
    ],
    [
      'a loop body, which this scan will not tell from a condition',
      [
        '      run: |',
        '        for i in 1; do',
        '          pnpm verify:artifacts',
        '        done',
        '      run: pnpm i',
      ],
      5,
    ],
    [
      'a bare group whose caller swallows it',
      ['      run: |', '        {', '          pnpm verify:artifacts', '        } || true', '      run: pnpm i'],
      5,
    ],
    [
      'a subshell whose caller swallows it',
      ['      run: |', '        (', '          pnpm verify:artifacts', '        ) || true', '      run: pnpm i'],
      5,
    ],
    [
      'a terminator whose opener is on no list here',
      [
        '      run: |',
        '        select x in a; do',
        '          pnpm verify:artifacts',
        '        done',
        '      run: pnpm i',
      ],
      5,
    ],
  ])('count no verify written inside a block: %s', (_case, source, expected) => {
    expect(unverifiedInstall(source as string[])).toBe(expected)
  })

  it.each([
    ['a verify that is only heredoc data', ['cat <<EOF > note.txt', 'pnpm verify:artifacts', 'EOF', 'pnpm i'], 4],
    ['the same behind a quoted delimiter', ["cat <<'END' > n.txt", 'pnpm verify:artifacts', 'END', 'pnpm i'], 4],
    ['the same behind the tab-stripping form', ['cat <<-EOF > n.txt', 'pnpm verify:artifacts', 'EOF', 'pnpm i'], 4],
    ['an install a heredoc feeds to a shell', ['sh <<EOF', 'pnpm install', 'EOF'], 2],
    ['a terminator with nothing open, outside any heredoc', ['pnpm verify:artifacts', '}', 'pnpm i'], 3],
  ])('read a heredoc body as data: %s', (_case, source, expected) => {
    expect(unverifiedInstall(source as string[])).toBe(expected)
  })

  it('fold a command that spans lines before reading it', () => {
    expect(carrier.logicalLines([`RUN a ${BS}`, '  b', 'RUN c']).map(({ text }) => text)).toEqual(['RUN a b', 'RUN c'])
    expect(carrier.logicalLines(['  run: >-', '    a', '    b', '  run: c']).map(({ text }) => text)).toEqual([
      'run: >-',
      'a b',
      'run: c',
    ])
    expect(carrier.logicalLines([`RUN a ${BS}`, '  b']).map(({ span }) => span)).toEqual([[0, 1]])
  })

  it('read a default shell the per-job scan never sees, in either style', () => {
    const workflow = (shell: string) => `defaults:\n  run:\n    shell: ${shell}\njobs:\n  test:\n`
    expect(carrier.unprovenDefaultShell(workflow('bash {0}'))).toBe(true)
    expect(carrier.unprovenDefaultShell(workflow('pwsh'))).toBe(true)
    expect(carrier.unprovenDefaultShell(workflow('bash'))).toBe(false)
    expect(carrier.unprovenDefaultShell('defaults: {run: {shell: pwsh}}\njobs:\n  test:\n')).toBe(true)
    expect(carrier.unprovenDefaultShell('defaults:\n  run: {shell: pwsh}\njobs:\n  test:\n')).toBe(true)
    expect(carrier.unprovenDefaultShell('defaults: {run: {shell: bash}}\njobs:\n  test:\n')).toBe(false)
    expect(carrier.unprovenDefaultShell('defaults:\n  run:\n    working-directory: ./x\njobs:\n  test:\n')).toBe(false)
    expect(carrier.unprovenDefaultShell('jobs:\n  test:\n    steps:\n')).toBe(false)
  })

  it.each([
    ['an explicit false', ['- continue-on-error: false', '  run: pnpm verify:artifacts', '- run: pnpm i']],
    ['a chain that propagates', ['RUN pnpm verify:artifacts && pnpm i']],
    ['an unguarded step', ['- run: pnpm verify:artifacts', '- run: pnpm i']],
    [
      'a conditional job, which skips its own install too',
      [
        '    if: github.ref == refs/heads/master',
        '    steps:',
        '    - run: pnpm verify:artifacts',
        '    - run: pnpm i',
      ],
    ],
    [
      'an earlier step that continues on error',
      [
        '- name: warm',
        '  continue-on-error: true',
        '  run: echo warm',
        '- name: gate',
        '  run: pnpm verify:artifacts',
        '- run: pnpm i',
      ],
    ],
    ['a continuation that swallows nothing', [`RUN pnpm verify:artifacts ${BS}`, '    --strict', 'RUN pnpm i']],
    ['a directory change ahead of it', ['RUN cd /app && pnpm verify:artifacts', 'RUN pnpm i']],
    ['an earlier group that only armed the shell', ['RUN set -e; pnpm verify:artifacts', 'RUN pnpm i']],
    ['the shell Actions vouches for', ['    - shell: bash', '      run: pnpm verify:artifacts', '    - run: pnpm i']],
    [
      'a relaxed shell the next step reopens',
      ['    - run: |', '        set +e', '        echo hi', '    - run: pnpm verify:artifacts', '    - run: pnpm i'],
    ],
    [
      'a verify run after the heredoc it follows closes',
      ['cat <<EOF > n.txt', 'hi', 'EOF', 'pnpm verify:artifacts', 'pnpm i'],
    ],
    [
      'an unmatched brace that is only heredoc data',
      ['pnpm verify:artifacts', 'cat <<EOF > a.json', '{ "a": 1,', '}', 'EOF', 'pnpm i'],
    ],
    [
      'a step that only prints the word shell',
      [
        '    defaults:',
        '      run:',
        '        shell: bash',
        '    steps:',
        '    - run: echo "shell: pwsh"',
        '    - run: pnpm verify:artifacts',
        '    - run: pnpm i',
      ],
    ],
  ])('still counts %s', (_case, source) => {
    expect(unverifiedInstall(source as string[])).toBeUndefined()
  })

  // It used to excuse a later install, and one from inside a `name:` or `echo`.
  it('take the exemption only from a comment on the line immediately above', () => {
    const marker = `      # ${OPT_OUT}`
    expect(unverifiedInstall([marker, '      run: pnpm i'])).toBeUndefined()
    expect(unverifiedInstall([marker, '      run: echo hi', '      run: pnpm i'])).toBe(3)
    expect(unverifiedInstall([`    - name: x # ${OPT_OUT}`, '      run: pnpm i'])).toBe(2)
    expect(unverifiedInstall([`      run: echo "${OPT_OUT}"`, '      run: pnpm i'])).toBe(2)
    expect(isOptOut(marker)).toBe(true)
    expect(isOptOut(`    - name: x # ${OPT_OUT}`)).toBe(false)
    expect(isOptOut(undefined)).toBe(false)
  })

  // A later stage is a fresh filesystem, and this Dockerfile is multi-stage.
  it('scope the Dockerfile scan to a build stage, not the file', () => {
    const verify = 'RUN node scripts/carrier-artifacts/verify.mjs'
    const leak = ['FROM node AS builder', verify, 'RUN pnpm install', 'FROM nginx:alpine', 'RUN pnpm add -g x']
    const stages = dockerfileStages(leak)
    expect([...stages.keys()]).toEqual(['builder', 'nginx:alpine'])
    expect(unverifiedInstall(stages.get('builder') as string[])).toBeUndefined()
    expect(unverifiedInstall(stages.get('nginx:alpine') as string[]), 'the runtime stage never verified').toBe(2)

    const real = rows(readFileSync(join(REPO, 'Dockerfile'), 'utf8'))
    const built = dockerfileStages(real)
    expect(built.size, 'an unreadable Dockerfile must not look like one with no installs').toBeGreaterThan(1)
    for (const lines of built.values()) expect(unverifiedInstall(lines)).toBeUndefined()
    const counted = (source: string[]) => source.filter((line) => !isComment(line) && installsDependencies(line)).length
    expect([...built.values()].reduce((total, stage) => total + counted(stage), 0)).toBe(counted(real))
  })

  it('allow exactly the declared number of written exemptions', () => {
    const scanned = [
      rows(readFileSync(join(REPO, 'Dockerfile'), 'utf8')),
      rows(readFileSync(join(REPO, '.cursor', 'install.sh'), 'utf8')),
      ...readdirSync(join(REPO, '.github', 'workflows')).map((file) =>
        rows(readFileSync(join(REPO, '.github', 'workflows', file), 'utf8')),
      ),
    ]
    const written = scanned.reduce((total, lines) => total + lines.filter(isOptOut).length, 0)
    expect(written, 'a marker no install needs is a bypass waiting to be moved').toBe(EXEMPT_INSTALLS)
  })

  // Repointing `install` orphans the scanned script without editing one.
  it('bind the agent environment to the bootstrap this scan reads', () => {
    const { install } = JSON.parse(readFileSync(join(REPO, ENVIRONMENT), 'utf8')) as { install?: string }
    expect(existsSync(join(REPO, BOOTSTRAP))).toBe(true)
    expect(install, `${ENVIRONMENT} must run the script the scan checks`).toContain(BOOTSTRAP)
    const outside = (command: string) => installsDependencies(command.replaceAll(BOOTSTRAP, ''))
    expect(outside(install ?? ''), 'nothing installs outside the bootstrap').toBe(false)
    for (const bypass of [
      `bash ${BOOTSTRAP} || pnpm install`,
      `bash ${BOOTSTRAP}; pnpm install`,
      `echo ${BOOTSTRAP} && pnpm install`,
    ])
      expect(outside(bypass), bypass).toBe(true)
  })

  it.each(readdirSync(join(REPO, '.github', 'workflows')))('account for every install in %s', (file) => {
    const yaml = readFileSync(join(REPO, '.github', 'workflows', file), 'utf8')
    const counted = (source: string[]) => source.filter((line) => !isComment(line) && installsDependencies(line)).length
    for (const shape of [yaml, yaml.replace(/^jobs:$/m, 'jobs: # comment'), indentJobs(yaml)]) {
      const jobs = workflowJobs(shape)
      expect(jobs.size, 'an unreadable workflow must not look like one with no installs').toBeGreaterThan(0)
      expect([...jobs.keys()]).not.toContain('push')
      expect([...jobs.values()].reduce((total, job) => total + counted(job), 0)).toBe(counted(rows(shape)))
    }
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
