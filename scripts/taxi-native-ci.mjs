import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { appendFile, mkdir, readFile, writeFile, stat, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv, promisify } from 'node:util'

export const refs = Object.freeze({
  solver: '9fd60fbaa0df6f6f343ead8c065a43436c365127',
  taxi: 'e7cdfa4124e4a10706c3f1ebaba677965133e73c',
  regtest: '78d0b7a9677077ca64bf09b4e825520ba462446b',
})
const projects = ['Mobile Chrome', 'Google Chrome']
const walletRoot = process.cwd()
const solverRoot = resolve(process.env.TAXI_NATIVE_SOLVER_ROOT ?? '.local-tests/native-solver')
const taxiRoot = resolve(process.env.TAXI_NATIVE_TAXI_ROOT ?? '.local-tests/native-taxi')
const regtestRoot = resolve('regtest')
let namespace = `taxi-native-${randomUUID().slice(0, 8)}`
let root = resolve('.local-tests', namespace)
const stateFile = resolve('.local-tests/native-ci-state.json')
const evidence = resolve('.local-tests/native-evidence')
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
let started = false
let daemon
let daemonOutput = ''
let feed
let context
let cleanupPromise
let daemonError
const registryBackups = new Map()

export async function appendEvidence(file, text) {
  await appendFile(file, `${redact(text)}\n`)
}

export async function cleanupOwnedStages({ relayStarted, captureLogs, cleanRelay, cleanInfra, cleanImages }) {
  const failures = []
  for (const stage of [captureLogs, ...(relayStarted ? [cleanRelay] : []), cleanInfra, cleanImages]) {
    try {
      await stage()
    } catch (error) {
      failures.push(error.message)
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

async function cleanOwnedResources() {
  await mkdir(evidence, { recursive: true })
  const failures = []
  if (daemon && !daemonError && daemon.exitCode === null && daemon.signalCode === null) {
    const exited = new Promise((done) => daemon.once('exit', done))
    daemon.kill('SIGTERM')
    await Promise.race([exited, new Promise((done) => setTimeout(done, 10_000))])
    if (daemon.exitCode === null && daemon.signalCode === null) daemon.kill('SIGKILL')
    await exited
  }
  if (context) {
    await context.wallet.dispose()
    context.close()
  }
  if (feed) await new Promise((done) => feed.close(done))
  if (daemon) await writeFile(resolve(evidence, 'solver.log'), redact(daemonOutput))
  if (started) {
    failures.push(
      ...(await cleanupOwnedStages({
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
            'taxi',
            '--profile',
            'ark',
            '--profile',
            'emulator',
            '--profile',
            'base',
            'logs',
            '--no-color',
          ]),
        cleanRelay: () =>
          run('relay-cleanup', 'docker', ['compose', '-p', `${namespace}-relay`, '-f', relayFile, 'down', '-v']),
        cleanInfra: () =>
          run('infra-cleanup', process.execPath, [
            resolve(regtestRoot, 'regtest.mjs'),
            'clean',
            '--env',
            env.TAXI_REGTEST_ENV_FILE,
          ]),
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
      })),
    )
    if (failures.length === 0) await writeFile(stateFile, JSON.stringify({ complete: true }), { mode: 0o600 })
  }
  for (const [file, original] of registryBackups) {
    if (original === null) await rm(file, { force: true })
    else await writeFile(file, original)
  }
  if (failures.length) throw new Error(failures.join('; '))
}

async function main() {
  const project = process.argv[2]
  assert(projects.includes(project), 'Pass exactly Mobile Chrome or Google Chrome')
  await mkdir(root, { recursive: true, mode: 0o700 })
  await mkdir(evidence, { recursive: true })
  for (const [name, path] of [
    ['solver', solverRoot],
    ['taxi', taxiRoot],
    ['regtest', regtestRoot],
  ]) {
    const head = (await run(`${name}-head`, 'git', ['rev-parse', 'HEAD'], { cwd: path })).trim()
    assert.equal(head, refs[name], `Wrong ${name} source checkpoint`)
  }
  const defaults = parseEnv(await readFile(resolve(regtestRoot, '.env.defaults'), 'utf8'))
  const infra = { ...defaults, REGTEST_PROJECT: namespace, REGTEST_CONTAINER_PREFIX: `${namespace}-` }
  infra.MEMPOOL_WEB_PORT = await port(3000)
  for (const key of Object.keys(defaults).filter((key) => key.endsWith('_PORT') && key !== 'MEMPOOL_WEB_PORT'))
    infra[key] = await port()
  for (const key of ['ARKD_IMAGE', 'ARKD_WALLET_IMAGE', 'EMULATOR_IMAGE']) {
    assert(process.env[key], `Provide explicitly pinned ${key}`)
    infra[key] = process.env[key]
  }
  for (const key of ['TAXI_OPERATOR_PRIVKEY', 'ARKD_WALLET_SIGNER_KEY']) {
    infra[key] = randomBytes(32).toString('hex')
    secrets.add(infra[key])
  }
  infra.ARKD_PASSWORD = randomBytes(16).toString('hex')
  secrets.add(infra.ARKD_PASSWORD)
  Object.assign(infra, {
    TAXI_IMAGE: `${namespace}-taxi`,
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
  env = { ...env, ...infra, TAXI_REGTEST_ENV_FILE: infrastructureEnv }
  await run('taxi-build', 'docker', ['build', '-t', infra.TAXI_IMAGE, taxiRoot])
  await run('nak-build', 'docker', ['build', '-t', `${namespace}-nak`, '-f', resolve('nak.Dockerfile'), walletRoot])
  relayFile = resolve(root, 'relay.json')
  await writeFile(stateFile, JSON.stringify({ namespace, root, relayFile, infrastructureEnv, relayStarted }), {
    mode: 0o600,
  })
  started = true
  await run('infra-start', process.execPath, [
    resolve(regtestRoot, 'regtest.mjs'),
    'start',
    '--profile',
    'taxi',
    '--env',
    infrastructureEnv,
  ])
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
  await writeFile(stateFile, JSON.stringify({ namespace, root, relayFile, infrastructureEnv, relayStarted }), {
    mode: 0o600,
  })
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
  const solverEnv = {
    SWAP_NETWORK: 'regtest',
    ARK_MNEMONIC: mnemonic,
    ARK_SERVER_URL: `http://localhost:${infra.ARKD_PORT}`,
    ARK_ESPLORA_URL: `http://localhost:${infra.MEMPOOL_WEB_PORT}/api`,
    EMULATOR_URL: `http://localhost:${infra.EMULATOR_PORT}`,
    TAXI_URL: `http://localhost:${infra.TAXI_HTTP_PORT}`,
    TAXI_RECEIVER_ALLOW_PRIVATE: '1',
    LN_SEND_ENABLED: 'false',
    LN_RECEIVE_ENABLED: 'false',
    ONCHAIN_SEND_ENABLED: 'false',
    ONCHAIN_RECEIVE_ENABLED: 'false',
    DB_DIR: resolve(root, 'solver-db'),
    RELAY_URL: `ws://localhost:${wsPort}`,
    RELAY_PROTOCOL: 'nostr',
    SOLVER_NAME: 'wallet-native',
    SOLVER_CARD_RELAYS: '',
    ASSET_MARKETS: '',
    ASSET_QUOTE_VALIDITY_SECONDS: '120',
    NOSTR_AD_PUBLISH: 'off',
    RELAY_HEALTH_PATH: resolve(root, 'relay-health'),
  }
  delete process.env.LN_BACKEND
  delete env.LN_BACKEND
  Object.assign(process.env, solverEnv)
  const [{ loadConfig }, { createArkadeContext }] = await Promise.all([
    fromSolver('packages/solver-app/dist/config.js'),
    fromSolver('packages/solver-arkade/dist/arkade/wallet.js'),
  ])
  const config = loadConfig()
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
  await context.wallet.settle()
  await waitFor(
    'minted solver ARFQ',
    async () =>
      (await context.wallet.getSpendableVtxos({ withRecoverable: false, genericallySpendableOnly: true }))
        .flatMap((coin) => coin.assets ?? [])
        .filter((entry) => entry.assetId === assetId)
        .reduce((sum, entry) => sum + BigInt(entry.amount), 0n) >= 2000n,
  )
  await context.wallet.dispose()
  context.close()
  context = undefined
  solverEnv.ASSET_MARKETS = `ARFQ:${assetId}`
  const solverEnvFile = resolve(root, 'solver.env')
  await privateEnv(solverEnvFile, solverEnv)
  const emulator = await (await fetch(`${solverEnv.EMULATOR_URL}/v1/info`)).json()
  assert.match(emulator.signerPubkey, /^0[23][0-9a-f]{64}$/)
  const walletEnv = {
    TAXI_NATIVE_SOLVER_ROOT: solverRoot,
    TAXI_NATIVE_SOLVER_ENV_FILE: solverEnvFile,
    TAXI_NATIVE_REGTEST_FIXTURE_FILE: resolve(root, 'fixture.json'),
    TAXI_REGTEST_ENV_FILE: infrastructureEnv,
    TAXI_REGTEST_ARKD_URL: solverEnv.ARK_SERVER_URL,
    TAXI_REGTEST_URL: solverEnv.TAXI_URL,
    TAXI_REGTEST_ADMIN_URL: `http://localhost:${infra.TAXI_ADMIN_PORT}`,
    TAXI_NATIVE_WALLET_URL: `http://127.0.0.1:${await port()}`,
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
    async () => (await stat(solverEnv.RELAY_HEALTH_PATH).catch(() => null))?.mtimeMs > boot + 1000,
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
      namespace = state.namespace
      root = state.root
      relayFile = state.relayFile
      relayStarted = state.relayStarted
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
      await main()
      console.log('Native Taxi browser project passed')
    } catch (error) {
      console.error(redact(error.message))
      process.exitCode = 1
    } finally {
      await mkdir(evidence, { recursive: true })
      await cleanup()
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await cli()
