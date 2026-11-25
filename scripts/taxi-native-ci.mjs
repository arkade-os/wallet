import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { appendFile, mkdir, readFile, writeFile, stat, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv, promisify } from 'node:util'
import { configureRegtestEsplora } from './regtest-esplora.mjs'

export const refs = Object.freeze({
  solver: '26b95db702de8f4b9cd0b6d6d5f246dcf7e8e430',
  taxi: '1e831e7ddc0c71c3f78e3bb6dc6d4bdadf11fa52',
  regtest: '7c91a6bdafd855ba8b8cc19cf35f46257eb1467d',
})
const projects = ['Mobile Chrome', 'Google Chrome']
const walletRoot = process.cwd()
const solverRoot = resolve(process.env.TAXI_NATIVE_SOLVER_ROOT ?? '.local-tests/native-solver')
const taxiRoot = resolve(process.env.TAXI_NATIVE_TAXI_ROOT ?? '.local-tests/native-taxi')
const regtestSource = resolve('regtest')
let namespace = `taxi-native-${randomUUID().slice(0, 8)}`
let root = resolve('.local-tests', namespace)
let regtestRoot = resolve(root, 'regtest')
const stateFile = resolve('.local-tests/native-ci-state.json')
let evidence = resolve('.local-tests/native-evidence', namespace)
const secrets = new Set()
const allocatedPorts = new Set(['60413', '60423', '60432', '60433'])
const redact = (text) => {
  for (const secret of secrets) text = text.split(secret).join('[redacted]')
  return text.replace(
    /("?(?:private_key|mnemonic|seed|password|secret_key)"?\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,}]+)/gi,
    '$1"[redacted]"',
  )
}
const execute = promisify(execFile)
let env = { ...process.env }
let relayFile
let relayStarted = false
let taxiFile
let taxiStarted = false
let started = false
let imagesAttempted = false
let daemon
let web
let webOutput = ''
let manualControl
let daemonOutput = ''
let feed
let context
let cleanupPromise
let ownsRoot = false
let daemonError
const registryBackups = new Map()

export async function appendEvidence(file, text) {
  await appendFile(file, `${redact(text)}\n`)
}

export function assertNativeReport(report, expected) {
  assert.equal(report?.stats?.expected, expected, 'Native phase did not run every approved case')
  for (const field of ['skipped', 'unexpected', 'flaky'])
    assert.equal(report?.stats?.[field], 0, `Native phase reported ${field} cases`)
  assert.equal(report.errors?.length ?? 0, 0, 'Native phase reported errors outside a case')
}

export function nativeArkdLoopbackCompose(source) {
  const before = "'${ARKD_PORT:-7070}:7070'"
  const after = "'127.0.0.1:${ARKD_PORT:-7070}:7070'"
  if (source.split(after).length === 2 && !source.includes(before)) return source
  assert.equal(source.split(before).length, 2, 'Pinned regtest Arkd publication changed')
  assert(!source.includes(after), 'Pinned regtest Arkd publication is ambiguous')
  return source.replace(before, after)
}

export function nativeTaxiCompose(namespace, infra) {
  assert.match(namespace, /^taxi-native-[0-9a-f]{8}$/)
  return {
    services: {
      taxi: {
        image: infra.TAXI_IMAGE,
        container_name: `${namespace}-taxi`,
        ports: [`127.0.0.1:${infra.TAXI_HTTP_PORT}:8080`, `127.0.0.1:${infra.TAXI_ADMIN_PORT}:8081`],
        volumes: ['taxi-data:/data'],
        environment: {
          TAXI_DB_PATH: '/data/taxi.db',
          TAXI_HTTP_PORT: '8080',
          TAXI_ADMIN_PORT: '8081',
          TAXI_ARKD_URL: 'http://arkd:7070',
          TAXI_EMULATOR_URL: 'http://emulator:7073',
          TAXI_ESPLORA_URL: 'http://mempool_web/api',
          TAXI_PUBLIC_ARKD_URL: `http://127.0.0.1:${infra.ARKD_PORT}`,
          TAXI_PUBLIC_EMULATOR_URL: `http://127.0.0.1:${infra.EMULATOR_PORT}`,
          TAXI_OPERATOR_PRIVKEY: infra.TAXI_OPERATOR_PRIVKEY,
          TAXI_OPERATOR_MIN_RESERVE_SATS: '10000',
          TAXI_MIN_EXPIRY_HEADROOM_BLOCKS: '144',
          TAXI_MIN_EXPIRY_HEADROOM_SECONDS: '86400',
          TAXI_VTXO_RENEWAL_THRESHOLD_SECONDS: '108000',
          TAXI_RECOVERY_BROADCAST_SECONDS: '43200',
          TAXI_RECOVERY_CRITICAL_SECONDS: '7200',
          TAXI_COVENANT_DEADLINE_SECONDS: '14400',
          TAXI_RECONCILE_INTERVAL_MS: '5000',
        },
      },
    },
    volumes: { 'taxi-data': {} },
    networks: { default: { external: true, name: `${namespace}_default` } },
  }
}

export async function cleanupOwnedStages({
  before = [],
  context,
  closeFeed,
  saveLogs,
  relayStarted,
  captureLogs,
  captureTaxiLogs,
  cleanRelay,
  cleanTaxi,
  cleanInfra,
  cleanImages,
  registryBackups = [],
}) {
  const failures = []
  const stages = [
    ...before,
    ...(context ? [() => context.wallet.dispose(), () => context.close()] : []),
    closeFeed,
    saveLogs,
    captureLogs,
    captureTaxiLogs,
    ...(relayStarted ? [cleanRelay] : []),
    cleanTaxi,
    cleanInfra,
    cleanImages,
    ...[...registryBackups].map(
      ([file, original]) =>
        () =>
          original === null ? rm(file, { force: true }) : writeFile(file, original),
    ),
  ]
  for (const stage of stages.filter(Boolean)) {
    try {
      await stage()
    } catch (error) {
      failures.push(redact(error?.message ?? String(error)))
    }
  }
  return failures
}

async function run(name, command, args, options = {}) {
  const windowsPnpm = process.platform === 'win32' && command === 'pnpm'
  if (windowsPnpm) {
    assert(
      args.every((arg) => /^[A-Za-z0-9 _:.=/-]+$/.test(arg)),
      'Unsafe pnpm shell argument',
    )
    args = args.map((arg) => `"${arg}"`)
  }
  try {
    const result = await execute(command, args, {
      cwd: walletRoot,
      env,
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
      shell: windowsPnpm,
      ...options,
    })
    await appendEvidence(resolve(evidence, `${name}.log`), `${result.stdout}\n${result.stderr}`)
    return result.stdout
  } catch (error) {
    await appendEvidence(resolve(evidence, `${name}.log`), `${error.stdout ?? ''}\n${error.stderr ?? ''}`)
    throw new Error(`${name} failed (exit ${error.code ?? 'unknown'}); see sanitized evidence`)
  }
}

async function waitFor(name, check, timeout = 120_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (daemonError || (daemon && (daemon.exitCode !== null || daemon.signalCode !== null)))
      throw new Error('Native solver exited')
    if (await check()) return
    await new Promise((done) => setTimeout(done, 1000))
  }
  throw new Error(`Timed out waiting for ${name}`)
}

export async function port(preferred = 0) {
  if (preferred && allocatedPorts.has(String(preferred)))
    throw new Error(`Required native port ${preferred} is unavailable`)
  const server = createServer()
  try {
    await new Promise((done, reject) => server.once('error', reject).listen(preferred, '127.0.0.1', done))
  } catch (error) {
    if (preferred) throw new Error(`Required native port ${preferred} is unavailable`, { cause: error })
    throw error
  }
  const value = server.address().port
  await new Promise((done) => server.close(done))
  if (allocatedPorts.has(String(value))) return port()
  allocatedPorts.add(String(value))
  return String(value)
}

async function privateEnv(file, values) {
  const text = Object.entries(values)
    .map(([key, value]) => {
      assert(!/['\r\n]/.test(value), `Unsupported private env value for ${key}`)
      return `${key}='${value}'`
    })
    .join('\n')
  await writeFile(file, text, {
    mode: 0o600,
  })
}

function cleanup() {
  return (cleanupPromise ??= cleanOwnedResources())
}

async function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise((done) => child.once('exit', done))
  child.kill('SIGTERM')
  await Promise.race([exited, new Promise((done) => setTimeout(done, 10_000))])
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  await exited
}

async function saveState(infrastructureEnv) {
  await writeFile(
    stateFile,
    JSON.stringify({ namespace, root, relayFile, infrastructureEnv, relayStarted, taxiFile, taxiStarted }),
    { mode: 0o600 },
  )
}

async function cleanOwnedResources() {
  const failures = await cleanupOwnedStages({
    before: [
      () => mkdir(evidence, { recursive: true }),
      () => stopChild(web),
      () => stopChild(daemon),
      () => manualControl && new Promise((done) => manualControl.close(done)),
    ],
    context,
    closeFeed: feed && (() => new Promise((done) => feed.close(done))),
    saveLogs: async () => {
      if (daemon) await writeFile(resolve(evidence, 'solver.log'), redact(daemonOutput))
      if (web) await writeFile(resolve(evidence, 'wallet-server.log'), redact(webOutput))
    },
    ...(started
      ? {
          relayStarted,
          captureLogs: () =>
            run('service-logs', 'docker', [
              'compose',
              '-p',
              namespace,
              '-f',
              resolve(regtestRoot, 'docker/compose.base.yml'),
              '-f',
              resolve(regtestRoot, 'docker/compose.ark.yml'),
              '-f',
              resolve(regtestRoot, 'docker/compose.evm.yml'),
              '--profile',
              'ark',
              '--profile',
              'emulator',
              '--profile',
              'base',
              'logs',
              '--no-color',
            ]),
          ...(taxiStarted
            ? {
                captureTaxiLogs: () =>
                  run('taxi-logs', 'docker', ['compose', '-p', namespace, '-f', taxiFile, 'logs', '--no-color']),
                cleanTaxi: () =>
                  run('taxi-cleanup', 'docker', [
                    'compose',
                    '-p',
                    namespace,
                    '-f',
                    taxiFile,
                    'down',
                    '-v',
                    '--timeout',
                    '10',
                  ]),
              }
            : {}),
          cleanRelay: () =>
            run('relay-cleanup', 'docker', ['compose', '-p', `${namespace}-relay`, '-f', relayFile, 'down', '-v']),
          cleanInfra: () =>
            run('infra-cleanup', process.execPath, [
              resolve(regtestRoot, 'regtest.mjs'),
              'clean',
              '--env',
              env.TAXI_REGTEST_ENV_FILE,
            ]),
        }
      : {}),
    ...(imagesAttempted
      ? {
          cleanImages: async () => {
            const owned = [`${namespace}-taxi`, `${namespace}-nak`]
            const inventory = await run('image-inventory', 'docker', [
              'image',
              'ls',
              '--format',
              '{{.Repository}}',
              '--filter',
              `reference=${namespace}-*`,
            ])
            const remaining = owned.filter((image) => inventory.split(/\r?\n/).includes(image))
            if (remaining.length) await run('image-cleanup', 'docker', ['image', 'rm', ...remaining])
          },
        }
      : {}),
    registryBackups,
  })
  if (failures.length) throw new Error(failures.join('; '))
  if (ownsRoot) {
    assert.match(namespace, /^taxi-native-[0-9a-f]{8}$/)
    assert.equal(root, resolve(walletRoot, '.local-tests', namespace))
    await rm(root, { recursive: true, force: true })
  }
  if (started) await writeFile(stateFile, JSON.stringify({ complete: true }), { mode: 0o600 })
}

async function manualSession() {
  const { startNativeWebServer } = await import('./taxi-native-web-server.mjs')
  web = startNativeWebServer(env, { stdio: ['ignore', 'pipe', 'pipe'] })
  web.on('error', (error) => {
    daemonError = error
  })
  for (const stream of [web.stdout, web.stderr])
    stream.on('data', (chunk) => {
      webOutput += chunk.toString()
    })
  await waitFor('manual wallet server', async () => {
    try {
      return (await fetch(env.TAXI_NATIVE_WALLET_URL)).ok
    } catch {
      return false
    }
  })
  await new Promise((done, reject) => {
    manualControl = createServer((request, response) => {
      const stop = request.method === 'POST' && request.url === '/stop'
      response.writeHead(stop ? 200 : 404)
      response.end()
      if (stop) done()
    })
    manualControl.once('error', reject).listen(0, '127.0.0.1', () => {
      console.log(
        JSON.stringify({
          manualReady: true,
          walletUrl: env.TAXI_NATIVE_WALLET_URL,
          stopUrl: `http://127.0.0.1:${manualControl.address().port}/stop`,
          infrastructureEnv: env.TAXI_REGTEST_ENV_FILE,
          namespace,
        }),
      )
    })
  })
}

async function main() {
  const project = process.argv[2]
  assert(projects.includes(project), 'Pass exactly Mobile Chrome or Google Chrome')
  assert(
    process.argv.length === 3 || (process.argv.length === 4 && process.argv[3] === '--manual'),
    'Only --manual may follow the browser project',
  )
  const manual = process.argv[3] === '--manual'
  assert(!manual || !process.env.CI || process.env.CI === 'false', '--manual is local only')
  await mkdir(resolve('.local-tests'), { recursive: true })
  await mkdir(root, { mode: 0o700 })
  ownsRoot = true
  await mkdir(evidence, { recursive: true })
  for (const [name, path] of [
    ['solver', solverRoot],
    ['taxi', taxiRoot],
    ['regtest', regtestSource],
  ]) {
    const head = (await run(`${name}-head`, 'git', ['rev-parse', 'HEAD'], { cwd: path })).trim()
    assert.equal(head, refs[name], `Wrong ${name} source checkpoint`)
  }
  const regtestArchive = resolve(root, 'regtest.tar')
  await run('regtest-export', 'git', ['archive', '--format=tar', '--output', regtestArchive, refs.regtest], {
    cwd: regtestSource,
  })
  await mkdir(regtestRoot)
  const tar = process.platform === 'win32' ? resolve(process.env.SystemRoot, 'System32/tar.exe') : 'tar'
  await run('regtest-extract', tar, ['-xf', regtestArchive, '-C', regtestRoot])
  await rm(regtestArchive)
  await configureRegtestEsplora(regtestRoot)
  const arkCompose = resolve(regtestRoot, 'docker/compose.ark.yml')
  await writeFile(arkCompose, nativeArkdLoopbackCompose(await readFile(arkCompose, 'utf8')))
  const defaults = parseEnv(await readFile(resolve(regtestRoot, '.env.defaults'), 'utf8'))
  const infra = { ...defaults, REGTEST_PROJECT: namespace, REGTEST_CONTAINER_PREFIX: `${namespace}-` }
  infra.MEMPOOL_WEB_PORT = await port()
  for (const key of Object.keys(defaults).filter((key) => key.endsWith('_PORT') && key !== 'MEMPOOL_WEB_PORT'))
    infra[key] = await port()
  for (const key of ['ARKD_IMAGE', 'ARKD_WALLET_IMAGE', 'ARKD_SIGNER_IMAGE', 'EMULATOR_IMAGE']) {
    assert(process.env[key], `Provide explicitly pinned ${key}`)
    infra[key] = process.env[key]
  }
  for (const key of ['TAXI_OPERATOR_PRIVKEY', 'ARKD_SIGNER_SECRET_KEY']) {
    infra[key] = randomBytes(32).toString('hex')
    secrets.add(infra[key])
  }
  infra.ARKD_PASSWORD = randomBytes(16).toString('hex')
  secrets.add(infra.ARKD_PASSWORD)
  Object.assign(infra, {
    TAXI_IMAGE: `${namespace}-taxi`,
    TAXI_HTTP_PORT: await port(),
    TAXI_ADMIN_PORT: await port(),
    ARKD_SCHEDULER_TYPE: 'gocron',
    ARKD_SESSION_DURATION: '10',
    ARKD_ROUND_INTERVAL: '3',
    ARKD_VTXO_TREE_EXPIRY: '172800',
    ARKD_UNILATERAL_EXIT_DELAY: '86400',
    ARKD_PUBLIC_UNILATERAL_EXIT_DELAY: '86400',
    ARKD_BOARDING_EXIT_DELAY: '7776000',
    ARKD_CHECKPOINT_EXIT_DELAY: '86400',
    ARK_OFFCHAIN_INPUT_FEE: '0.0',
    ARK_ONCHAIN_INPUT_FEE: '0.0',
    ARK_OFFCHAIN_OUTPUT_FEE: '0.0',
    ARK_ONCHAIN_OUTPUT_FEE: '0.0',
    AUTOMINE_INTERVAL: '0',
  })
  for (const [key, value] of Object.entries(infra)) {
    if (/SECRET|PASSWORD|PRIVKEY|MNEMONIC|SIGNER_KEY/.test(key) && value) secrets.add(value)
  }
  const infrastructureEnv = resolve(root, 'infrastructure.env')
  await privateEnv(infrastructureEnv, infra)
  env = {
    ...env,
    ...infra,
    TAXI_REGTEST_ENV_FILE: infrastructureEnv,
  }
  imagesAttempted = true
  await run('taxi-build', 'docker', ['build', '-t', infra.TAXI_IMAGE, taxiRoot])
  await run('nak-build', 'docker', ['build', '-t', `${namespace}-nak`, '-f', resolve('nak.Dockerfile'), walletRoot])
  relayFile = resolve(root, 'relay.json')
  taxiFile = resolve(root, 'taxi.json')
  await writeFile(taxiFile, JSON.stringify(nativeTaxiCompose(namespace, infra)), { mode: 0o600 })
  await saveState(infrastructureEnv)
  started = true
  await run('infra-start', process.execPath, [
    resolve(regtestRoot, 'regtest.mjs'),
    'start',
    '--profile',
    'emulator',
    '--env',
    infrastructureEnv,
  ])
  taxiStarted = true
  await saveState(infrastructureEnv)
  await run('taxi-start', 'docker', ['compose', '-p', namespace, '-f', taxiFile, 'up', '-d'])
  const taxiAdmin = `http://127.0.0.1:${infra.TAXI_ADMIN_PORT}/admin/api`
  await waitFor('Taxi startup', async () => {
    try {
      return (await fetch(`http://127.0.0.1:${infra.TAXI_HTTP_PORT}/health`)).ok
    } catch {
      return false
    }
  })
  const funding = await fetch(`${taxiAdmin}/funding`)
  assert(funding.ok, 'Taxi funding address unavailable')
  const { arkAddress } = await funding.json()
  assert.equal(typeof arkAddress, 'string')
  await run('taxi-fund', process.execPath, [
    resolve(regtestRoot, 'regtest.mjs'),
    'ark',
    '--env',
    infrastructureEnv,
    'send',
    '--to',
    arkAddress,
    '--amount',
    '3000000',
    '--password',
    infra.ARKD_PASSWORD,
  ])
  const policy = await fetch(`${taxiAdmin}/policy`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-taxi-operator': 'wallet-native' },
    body: JSON.stringify({
      paused: false,
      maxOutstandingSats: '10000000',
      maxPerPaymentTopupSats: '100000',
      maxConcurrentAdvances: 20,
    }),
  })
  assert(policy.ok, 'Taxi policy initialization failed')
  await waitFor('Taxi readiness', async () => (await fetch(`http://127.0.0.1:${infra.TAXI_HTTP_PORT}/ready`)).ok)
  await run('provider-images', 'docker', [
    'inspect',
    '--format',
    '{{.Name}} {{.Config.Image}} {{.Image}}',
    `${namespace}-arkd`,
    `${namespace}-arkd-wallet`,
    `${namespace}-emulator`,
    `${namespace}-taxi`,
  ])
  const wsPort = await port()
  const wssPort = await port()
  await run('relay-cert', 'openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    resolve(root, 'key.pem'),
    '-out',
    resolve(root, 'cert.pem'),
    '-days',
    '1',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ])
  const nginx = resolve(root, 'nginx.conf')
  await writeFile(
    nginx,
    'events {}\nhttp { server { listen 10548 ssl; ssl_certificate /certs/cert.pem; ssl_certificate_key /certs/key.pem; location / { proxy_pass http://nak:10547; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_read_timeout 3600s; } } }',
  )
  await writeFile(
    relayFile,
    JSON.stringify({
      services: {
        nak: {
          image: `${namespace}-nak`,
          command: ['nak', 'serve', '--hostname', '0.0.0.0', '--port', '10547'],
          ports: [`127.0.0.1:${wsPort}:10547`],
        },
        tls: {
          image: 'nginx:alpine',
          depends_on: ['nak'],
          ports: [`127.0.0.1:${wssPort}:10548`],
          volumes: [
            `${nginx}:/etc/nginx/nginx.conf:ro`,
            `${resolve(root, 'cert.pem')}:/certs/cert.pem:ro`,
            `${resolve(root, 'key.pem')}:/certs/key.pem:ro`,
          ],
        },
      },
    }),
  )
  relayStarted = true
  await saveState(infrastructureEnv)
  await run('relay-start', 'docker', ['compose', '-p', `${namespace}-relay`, '-f', relayFile, 'up', '-d'])
  feed = createServer((request, response) => {
    response.writeHead(request.url === '/price' ? 200 : 404, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    })
    response.end(JSON.stringify(request.url === '/price' ? { price: '100000000' } : { error: 'not found' }))
  })
  await new Promise((done, reject) => feed.once('error', reject).listen(0, '127.0.0.1', done))
  const feedUrl = `http://127.0.0.1:${feed.address().port}/price`
  const require = createRequire(resolve(solverRoot, 'packages/solver-app/package.json'))
  const fromSolver = (path) => import(pathToFileURL(resolve(solverRoot, path)).href)
  const [{ entropyToMnemonic }, { wordlist }] = await Promise.all([
    import(pathToFileURL(require.resolve('@scure/bip39')).href),
    import(pathToFileURL(require.resolve('@scure/bip39/wordlists/english.js')).href),
  ])
  const mnemonic = entropyToMnemonic(randomBytes(16), wordlist)
  secrets.add(mnemonic)
  const solverConfigFile = resolve(root, 'solver.json')
  const solverDocument = {
    network: 'regtest',
    name: 'wallet-native',
    rails: {
      arkade: {
        mnemonic,
        operatorUrl: `http://127.0.0.1:${infra.ARKD_PORT}`,
        esploraUrl: `http://127.0.0.1:${infra.MEMPOOL_WEB_PORT}/api`,
        emulatorUrl: `http://127.0.0.1:${infra.EMULATOR_PORT}`,
        taxiUrl: `http://127.0.0.1:${infra.TAXI_HTTP_PORT}`,
      },
    },
    corridors: Object.fromEntries(
      ['arkade:BTC->lightning:BTC', 'lightning:BTC->arkade:BTC', 'arkade:BTC->onchain:BTC'].map((pair) => [
        pair,
        { enabled: false },
      ]),
    ),
    storage: { dir: resolve(root, 'solver-db') },
    offers: { quoteValiditySeconds: 120 },
    relay: {
      url: `ws://localhost:${wsPort}`,
      protocol: 'nostr',
      adPublish: 'off',
      cardRelays: [],
      healthPath: resolve(root, 'relay-health'),
    },
    assets: {},
  }
  const solverEnv = { SOLVER_CONFIG: solverConfigFile, TAXI_RECEIVER_ALLOW_PRIVATE: '1' }
  const [{ loadConfig, legacyEnvNames }, { createArkadeContext }] = await Promise.all([
    fromSolver('packages/solver-app/dist/config/load.js'),
    fromSolver('packages/solver-arkade/dist/arkade/wallet.js'),
  ])
  for (const name of legacyEnvNames(env)) delete env[name]
  for (const name of legacyEnvNames(process.env)) delete process.env[name]
  Object.assign(process.env, solverEnv)
  await writeFile(solverConfigFile, JSON.stringify(solverDocument, null, 2), { mode: 0o600 })
  const config = loadConfig({ env: solverEnv })
  assert.equal(config.lnBackend, null)
  assert(Object.values(config.corridorEnabled).every((enabled) => !enabled))
  context = await createArkadeContext(config.arkade)
  const address = await context.wallet.getAddress()
  await run('solver-fund', process.execPath, [
    resolve(regtestRoot, 'regtest.mjs'),
    'ark',
    '--env',
    infrastructureEnv,
    'send',
    '--to',
    address,
    '--amount',
    '3000000',
    '--password',
    infra.ARKD_PASSWORD,
  ])
  await waitFor('solver spendable sats', async () =>
    (await context.wallet.getSpendableVtxos({ withRecoverable: false, genericallySpendableOnly: true })).some(
      (coin) => coin.value > 0,
    ),
  )
  const { assetId } = await context.wallet.assetManager.issue({
    amount: 1_000_000n,
    metadata: { ticker: 'ARFQ', name: 'Native Taxi RFQ', decimals: 0 },
  })
  await waitFor('spendable issued solver ARFQ', async () =>
    (
      await context.wallet.getSpendableVtxos({
        withRecoverable: true,
        genericallySpendableOnly: true,
        maxSyncAgeMs: 0,
        requireSynced: true,
      })
    ).some((coin) => coin.assets?.some((entry) => entry.assetId === assetId && BigInt(entry.amount) > 0n)),
  )
  await context.wallet.settle()
  await waitFor(
    'minted solver ARFQ',
    async () =>
      (await context.wallet.getSpendableVtxos({ withRecoverable: false, genericallySpendableOnly: true }))
        .flatMap((coin) => coin.assets ?? [])
        .filter((entry) => entry.assetId === assetId)
        .reduce((sum, entry) => sum + BigInt(entry.amount), 0n) >= 2000n,
  )
  const contextFailures = await cleanupOwnedStages({ context })
  context = undefined
  if (contextFailures.length) throw new Error(contextFailures.join('; '))
  solverDocument.assets.ARFQ = { kind: 'arkade', assetId }
  await writeFile(solverConfigFile, JSON.stringify(solverDocument, null, 2), { mode: 0o600 })
  const solverEnvFile = resolve(root, 'solver.env')
  await privateEnv(solverEnvFile, solverEnv)
  const emulator = await (await fetch(`${solverDocument.rails.arkade.emulatorUrl}/v1/info`)).json()
  assert.match(emulator.signerPubkey, /^0[23][0-9a-f]{64}$/)
  const walletEnv = {
    TAXI_NATIVE_SOLVER_ROOT: solverRoot,
    TAXI_NATIVE_SOLVER_ENV_FILE: solverEnvFile,
    TAXI_NATIVE_REGTEST_FIXTURE_FILE: resolve(root, 'fixture.json'),
    TAXI_REGTEST_ENV_FILE: infrastructureEnv,
    TAXI_REGTEST_ARKD_URL: solverDocument.rails.arkade.operatorUrl,
    TAXI_REGTEST_URL: solverDocument.rails.arkade.taxiUrl,
    TAXI_REGTEST_ADMIN_URL: `http://127.0.0.1:${infra.TAXI_ADMIN_PORT}`,
    TAXI_NATIVE_WALLET_URL: `http://127.0.0.1:${await port()}`,
    VITE_ELECTRUM_URL: `ws://127.0.0.1:${infra.FULCRUM_WS_PORT}`,
    TAXI_NATIVE_ADVERTISED_RELAY_URL: `wss://localhost:${wssPort}`,
    TAXI_NATIVE_PRICE_FEED_URL: feedUrl,
    TAXI_NATIVE_PRICE_PATH: '/price',
    TAXI_NATIVE_RFQ_ASSET_ID: assetId,
    TAXI_NATIVE_RFQ_ATOMIC_UNITS: '1000',
    TAXI_NATIVE_RFQ_FARE_SATS: '7',
    VITE_EMULATOR_PUBKEY: emulator.signerPubkey,
    ARKD_PASSWORD: infra.ARKD_PASSWORD,
  }
  const walletEnvFile = resolve(root, 'wallet.env')
  await privateEnv(walletEnvFile, walletEnv)
  env = { ...env, ...walletEnv, TAXI_NATIVE_REGTEST_ENV_FILE: walletEnvFile }
  for (const path of [
    'public/solver-registry/wallet-native.card.json',
    'public/solver-registry/regtest.json',
    'public/asset-registry/regtest.json',
  ]) {
    const file = resolve(path)
    registryBackups.set(
      file,
      await readFile(file).catch((error) => {
        if (error.code === 'ENOENT') return null
        throw error
      }),
    )
  }
  await run('native-setup', process.execPath, ['--experimental-eventsource', 'scripts/taxi-native-setup.mjs'])
  daemon = spawn(
    process.execPath,
    [
      '--enable-source-maps',
      '--experimental-eventsource',
      `--env-file=${solverEnvFile}`,
      'packages/solver-app/dist/cli.js',
      'relay',
    ],
    { cwd: solverRoot, env: { ...env, ...solverEnv }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  daemon.on('error', (error) => {
    daemonError = error
    daemonOutput += error.message
  })
  daemon.stdout.on('data', (chunk) => {
    daemonOutput += chunk.toString()
  })
  daemon.stderr.on('data', (chunk) => {
    daemonOutput += chunk.toString()
  })
  const boot = Date.now()
  await waitFor(
    'connected native RFQ relay',
    async () => (await stat(solverDocument.relay.healthPath).catch(() => null))?.mtimeMs > boot + 1000,
  )
  await run('wallet-git-info', 'pnpm', ['git-info'])
  await run('wallet-worker', 'pnpm', ['build:worker'])
  await run('playwright', 'pnpm', [
    'exec',
    'playwright',
    'test',
    '--config',
    'playwright.taxi-regtest.config.ts',
    `--project=${project}`,
  ])
  assertNativeReport(JSON.parse(await readFile(resolve('test-results/native-results.json'), 'utf8')), 8)
  await run(
    'native-funding-proof',
    process.execPath,
    ['--experimental-eventsource', 'scripts/taxi-native-funding.mjs'],
    {
      timeout: 480_000,
      env: { ...env, NODE_EXTRA_CA_CERTS: resolve(root, 'cert.pem'), NODE_TLS_REJECT_UNAUTHORIZED: '1' },
    },
  )
  if (manual) await manualSession()
  await run('playwright-terminal', 'pnpm', [
    'exec',
    'playwright',
    'test',
    '--config',
    'playwright.taxi-terminal.config.ts',
    `--project=${project}`,
  ])
  assertNativeReport(JSON.parse(await readFile(resolve('test-results/native-terminal-results.json'), 'utf8')), 1)
  if (manual) return 'manual'
}

async function cli() {
  if (process.argv[2] === '--cleanup') {
    try {
      const state = JSON.parse(await readFile(stateFile, 'utf8'))
      if (state.complete === true) process.exit(0)
      assert.match(state.namespace, /^taxi-native-[0-9a-f]{8}$/)
      assert.equal(state.root, resolve('.local-tests', state.namespace))
      assert.equal(state.relayFile, resolve(state.root, 'relay.json'))
      assert.equal(state.infrastructureEnv, resolve(state.root, 'infrastructure.env'))
      assert.equal(typeof state.relayStarted, 'boolean')
      assert.equal(state.taxiFile, resolve(state.root, 'taxi.json'))
      assert.equal(typeof state.taxiStarted, 'boolean')
      namespace = state.namespace
      root = state.root
      ownsRoot = true
      evidence = resolve('.local-tests/native-evidence', namespace)
      regtestRoot = resolve(root, 'regtest')
      relayFile = state.relayFile
      relayStarted = state.relayStarted
      taxiFile = state.taxiFile
      taxiStarted = state.taxiStarted
      env = {
        ...env,
        ...parseEnv(await readFile(state.infrastructureEnv, 'utf8')),
        TAXI_REGTEST_ENV_FILE: state.infrastructureEnv,
      }
      for (const [key, value] of Object.entries(env))
        if (/SECRET|PASSWORD|PRIVKEY|MNEMONIC|SIGNER_KEY/.test(key) && value) secrets.add(value)
      assert.equal(env.REGTEST_PROJECT, namespace)
      assert.equal(env.REGTEST_CONTAINER_PREFIX, `${namespace}-`)
      started = true
      imagesAttempted = true
      await cleanup()
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(redact(error.message))
        process.exitCode = 1
      }
    }
  } else if (process.argv[2] === '--self-test') {
    for (const ref of Object.values(refs)) assert.match(ref, /^[0-9a-f]{40}$/)
    secrets.add('private test phrase')
    assert.equal(redact('a private test phrase b'), 'a [redacted] b')
    assert.equal(redact('{"private_key":"unknown-key"}'), '{"private_key":"[redacted]"}')
    assert.deepEqual(parseEnv('KEY="value"'), { KEY: 'value' })
    assert.equal(parseEnv("KEY='C:\\Git\\native wallet'").KEY, 'C:\\Git\\native wallet')
    console.log('Native CI static self-check passed')
  } else {
    for (const signal of ['SIGINT', 'SIGTERM'])
      process.once(signal, () => {
        process.exitCode = 1
        cleanup().finally(() => process.exit(1))
      })
    try {
      const mode = await main()
      console.log(mode === 'manual' ? 'Native Taxi manual session closed' : 'Native Taxi browser project passed')
    } catch (error) {
      console.error(redact(error.message))
      process.exitCode = 1
    } finally {
      await cleanup()
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await cli()
