import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseEnv, promisify } from 'node:util'

const command = promisify(execFile)
const json = async (path) => JSON.parse(await readFile(path, 'utf8'))
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const poll = async (read, accept, label) => {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const value = await read()
    if (accept(value)) return value
    await pause(500)
  }
  throw new Error(`Timed out: ${label}`)
}
const loopback = (value) => {
  const url = new URL(value)
  assert.equal(url.protocol, 'http:')
  assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  assert(!url.username && !url.password && !url.search && !url.hash)
  return url.href.replace(/\/$/, '')
}
const bound = (target, name) => {
  const value = Reflect.get(target, name, target)
  return typeof value === 'function' ? value.bind(target) : value
}

export async function assertNativeFundingOwnership(
  walletRoot = process.cwd(),
  nativeEnvFile = process.env.TAXI_NATIVE_REGTEST_ENV_FILE,
  runCommand = command,
) {
  walletRoot = resolve(walletRoot)
  assert(nativeEnvFile, 'Provide the private native wallet env file')
  nativeEnvFile = resolve(nativeEnvFile)
  const namespace = basename(dirname(nativeEnvFile))
  assert.match(namespace, /^taxi-native-[0-9a-f]{8}$/)
  const root = resolve(walletRoot, '.local-tests', namespace)
  assert.equal(nativeEnvFile, resolve(root, 'wallet.env'))
  const env = parseEnv(await readFile(nativeEnvFile, 'utf8'))
  const infrastructureFile = resolve(env.TAXI_REGTEST_ENV_FILE)
  assert.equal(infrastructureFile, resolve(root, 'infrastructure.env'))
  const infrastructure = parseEnv(await readFile(infrastructureFile, 'utf8'))
  assert.equal(infrastructure.REGTEST_PROJECT, namespace)
  assert.equal(infrastructure.REGTEST_CONTAINER_PREFIX, `${namespace}-`)
  const state = await json(resolve(walletRoot, '.local-tests/native-ci-state.json'))
  assert.equal(state.namespace, namespace)
  assert.equal(state.root, root)
  assert.equal(state.infrastructureEnv, infrastructureFile)
  assert.equal(state.taxiStarted, true)
  const operatorUrl = loopback(env.TAXI_REGTEST_ARKD_URL)
  assert.equal(operatorUrl, `http://127.0.0.1:${infrastructure.ARKD_PORT}`)
  const adminUrl = loopback(env.TAXI_REGTEST_ADMIN_URL)
  assert.equal(adminUrl, `http://127.0.0.1:${infrastructure.TAXI_ADMIN_PORT}`)
  loopback(env.TAXI_NATIVE_WALLET_URL)
  for (const [service, internalPort, hostPort] of [
    ['arkd', 7070, infrastructure.ARKD_PORT],
    ['taxi', 8081, infrastructure.TAXI_ADMIN_PORT],
  ]) {
    const { stdout } = await runCommand(
      'docker',
      [
        'inspect',
        '--format',
        `{{index .Config.Labels "com.docker.compose.project"}}\n{{json (index .NetworkSettings.Ports "${internalPort}/tcp")}}`,
        `${namespace}-${service}`,
      ],
      { windowsHide: true, timeout: 10_000 },
    )
    const [project, ports] = stdout.trim().split(/\r?\n/)
    assert.equal(project, namespace)
    assert.deepEqual(JSON.parse(ports), [{ HostIp: '127.0.0.1', HostPort: hostPort }])
  }
  return { walletRoot, env, infrastructureFile, infrastructure, namespace, root, operatorUrl, adminUrl }
}

export async function runFundingProof(
  walletRoot = process.cwd(),
  nativeEnvFile = process.env.TAXI_NATIVE_REGTEST_ENV_FILE,
) {
  const scope = await assertNativeFundingOwnership(walletRoot, nativeEnvFile)
  const { env, infrastructureFile, infrastructure, namespace, root, operatorUrl, adminUrl } = scope
  walletRoot = scope.walletRoot
  const { refs } = await import(pathToFileURL(resolve(walletRoot, 'scripts/taxi-native-ci.mjs')).href)
  const source = {
    wallet: undefined,
    solver: undefined,
    taxi: undefined,
    regtest: refs.regtest,
  }
  for (const [name, path] of [
    ['wallet', walletRoot],
    ['solver', env.TAXI_NATIVE_SOLVER_ROOT],
    ['taxi', process.env.TAXI_NATIVE_TAXI_ROOT ?? resolve(walletRoot, '.local-tests/native-taxi')],
  ]) {
    const { stdout } = await command('git', ['rev-parse', 'HEAD'], {
      cwd: path,
      windowsHide: true,
      timeout: 10_000,
    })
    source[name] = stdout.trim()
    if (name !== 'wallet') assert.equal(source[name], refs[name])
  }
  await command(process.execPath, [resolve(walletRoot, 'scripts/carrier-artifacts/verify.mjs')], {
    cwd: walletRoot,
    windowsHide: true,
    timeout: 60_000,
  })
  const manifest = await json(resolve(walletRoot, 'vendor/carrier/manifest.json'))
  const require = createRequire(resolve(walletRoot, 'package.json'))
  const importing = (name) => import(pathToFileURL(require.resolve(name)).href)
  const installed = async (name) => json(resolve(dirname(require.resolve(name)), '../package.json'))
  const sdkPackage = await installed('@arkade-os/sdk')
  const swapPackage = await installed('@arkade-os/swap')
  assert.equal(sdkPackage.version, '0.5.7-taxi.2')
  assert.equal(swapPackage.version, '0.2.0-taxi.0')
  const fixtureFile = resolve(env.TAXI_NATIVE_REGTEST_FIXTURE_FILE)
  assert.equal(fixtureFile, resolve(root, 'fixture.json'))
  const fixture = await json(fixtureFile)
  const assetId = fixture.TAXI_NATIVE_RFQ_ASSET_ID
  assert.match(assetId, /^[0-9a-f]{68}$/)
  const {
    Wallet,
    SingleKey,
    RestOperatorProvider,
    RestIndexerProvider,
    EsploraProvider,
    InMemoryWalletRepository,
    InMemoryContractRepository,
    ArkAddress,
    getAllNormalizedVtxos,
    asset,
  } = await importing('@arkade-os/sdk')
  const { createSwapClient, arkadeAsset } = await importing('@arkade-os/swap')
  const { nodeSwapRepository } = await importing('@arkade-os/swap/node')
  const { ASSET_CARRIER_SATS } = await importing('@arkade-os/swap/protocol')
  const privateRoot = resolve(root, 'same-quote-funding')
  await mkdir(privateRoot, { mode: 0o700 })
  const database = resolve(privateRoot, 'swaps.sqlite')
  let wallet, repository, client
  let stage = 'create-wallet'
  let sends = 0
  let submits = 0
  let emptyReads = 0
  let originalTxid
  let depositScript
  let hideDeposit = false
  let expectedDeadline
  let fundingRequest
  let failed = false
  const card = await json(resolve(walletRoot, 'public/solver-registry/wallet-native.card.json'))
  assert.equal(card.name, 'wallet-native')
  const feedUrl = loopback(env.TAXI_NATIVE_PRICE_FEED_URL)
  const nativeMarket = card.markets.find(
    (market) =>
      market.base_asset.id === 'arkade:regtest/slip44:1' && market.quote_asset.id === `arkade:regtest/asset:${assetId}`,
  )
  assert.equal(nativeMarket?.price_feed, feedUrl)
  const operator = new RestOperatorProvider(operatorUrl)
  const provider = new Proxy(operator, {
    get(target, name) {
      if (name === 'submitTx')
        return (...args) => {
          submits++
          return target.submitTx(...args)
        }
      return bound(target, name)
    },
  })
  try {
    wallet = await Wallet.create({
      identity: SingleKey.fromRandomBytes(),
      operatorProvider: provider,
      indexerProvider: new RestIndexerProvider(operatorUrl),
      onchainProvider: new EsploraProvider(`http://127.0.0.1:${infrastructure.MEMPOOL_WEB_PORT}/api`),
      storage: {
        walletRepository: new InMemoryWalletRepository(),
        contractRepository: new InMemoryContractRepository(),
      },
      settlementConfig: false,
    })
    assert.equal((await wallet.getArkadeInfo()).network, 'regtest')
    const trader = await wallet.getAddress()
    stage = 'fund-private-wallet'
    await command(
      process.execPath,
      [
        resolve(root, 'regtest/regtest.mjs'),
        'ark',
        '--env',
        infrastructureFile,
        'send',
        '--to',
        trader,
        '--amount',
        '50000',
        '--password',
        infrastructure.ARKD_PASSWORD,
      ],
      {
        windowsHide: true,
        timeout: 90_000,
      },
    )
    await poll(
      () => wallet.getBalance(),
      (balance) => balance.available === 50_000,
      'funded private wallet',
    )
    const response = await fetch(`${adminUrl}/admin/api/funding`)
    assert(response.ok)
    const { arkAddress: taxi } = await response.json()
    const parties = {
      trader,
      solver: fixture.TAXI_NATIVE_RFQ_SOLVER_ADDRESS,
      taxi,
    }
    const indexer = new RestIndexerProvider(operatorUrl)
    const ledger = async () =>
      Object.fromEntries(
        await Promise.all(
          Object.entries(parties).map(async ([name, address]) => {
            const coins = await getAllNormalizedVtxos(
              indexer,
              [Buffer.from(ArkAddress.decode(address).pkScript).toString('hex')],
              { spendableOnly: true },
            )
            return [
              name,
              {
                sats: coins.reduce((sum, coin) => sum + BigInt(coin.value), 0n).toString(),
                units: coins
                  .flatMap((coin) => coin.assets ?? [])
                  .filter((entry) => entry.assetId === assetId)
                  .reduce((sum, entry) => sum + BigInt(entry.amount), 0n)
                  .toString(),
              },
            ]
          }),
        ),
      )
    const before = await ledger()
    const ids = async () => {
      const response = await fetch(`${adminUrl}/admin/api/advances`)
      assert(response.ok)
      return (await response.json()).advances.map(({ id }) => id).sort()
    }
    const previousAdvances = await ids()
    const wrapped = new Proxy(wallet, {
      get(target, name) {
        if (name === 'send')
          return async (...args) => {
            sends++
            assert.equal(sends, 1, 'Repeated accept attempted another wallet.send')
            assert.equal(args[0].maxChangeFee, 0)
            assert.equal(args[0].validUntil, expectedDeadline)
            fundingRequest = {
              maxChangeFee: args[0].maxChangeFee,
              validUntil: args[0].validUntil,
              recipientAmount: args[0].recipients[0].amount,
              extensions: args[0].recipients[0].extensions.length,
            }
            originalTxid = await target.send(...args)
            throw new Error('Injected lost successful funding return')
          }
        if (name === 'getArkadeReader')
          return async () => {
            const reader = await target.getArkadeReader()
            return new Proxy(reader, {
              get(target, name) {
                if (name === 'getVtxos')
                  return async (query) => {
                    const result = await target.getVtxos(query)
                    if (hideDeposit && query.scripts?.length === 1 && query.scripts[0] === depositScript) {
                      emptyReads++
                      return { ...result, vtxos: [] }
                    }
                    return result
                  }
                return bound(target, name)
              },
            })
          }
        return bound(target, name)
      },
    })
    const create = () =>
      createSwapClient({
        wallet: wrapped,
        repository,
        discovery: {
          registryUrl: null,
          localCards: [{ card, network: 'regtest' }],
          network: 'regtest',
          transportCards: null,
        },
        emulatorPubkey: env.VITE_EMULATOR_PUBKEY,
        policy: {
          drive: 'manual',
          selectMarket: (markets) => markets.find((market) => market.backend === 'feed'),
        },
      })
    repository = nodeSwapRepository({ network: 'regtest', path: database })
    assert.equal(repository.version, 6)
    client = create()
    stage = 'lose-successful-funding-return'
    const quote = await client.quote({
      give: 'arkade:regtest/slip44:1',
      take: arkadeAsset('regtest', asset.AssetId.fromString(assetId)),
      amount: 3000n,
      amountOn: 'give',
    })
    expectedDeadline = quote.expiresAt
    await assert.rejects(
      client.accept(quote, { validUntil: quote.expiresAt }),
      /Injected lost successful funding return/,
    )
    assert.match(originalTxid, /^[0-9a-f]{64}$/)
    const original = await repository.getSwapRecord(quote.id)
    assert.equal(original.family, 'offer')
    assert.equal(original.fundingTxid, undefined)
    depositScript = original.swapPkScript
    hideDeposit = true
    stage = 'repeat-with-empty-deposit-projection'
    assert.equal((await client.accept(quote)).fundingTxid, undefined)
    assert.equal(sends, 1)
    assert.equal(submits, 1)
    assert(emptyReads > 0)
    await client[Symbol.asyncDispose]()
    client = undefined
    await repository[Symbol.asyncDispose]()
    repository = nodeSwapRepository({ network: 'regtest', path: database })
    client = create()
    stage = 'reopened-client-empty-deposit-projection'
    const readsBeforeRestart = emptyReads
    assert.equal((await client.accept(quote)).fundingTxid, undefined)
    assert(emptyReads > readsBeforeRestart)
    assert.equal(sends, 1)
    assert.equal(submits, 1)
    hideDeposit = false
    stage = 'restore-real-positive-deposit-proof'
    const positive = await getAllNormalizedVtxos(indexer, [depositScript])
    assert(positive.some((coin) => coin.txid === originalTxid && BigInt(coin.value) === quote.give.amount))
    assert.equal((await client.accept(quote)).fundingTxid, originalTxid)
    const stored = await repository.getSwapRecord(quote.id)
    assert.equal(stored.offerHex, original.offerHex)
    assert.equal(stored.id, quote.id)
    await client.start()
    await poll(
      () => repository.getSwapRecord(quote.id),
      (record) => record.status === 'fulfilled',
      'original offer fulfillment',
    )
    const delta = (value, sats, units) => ({
      sats: (BigInt(value.sats) + sats).toString(),
      units: (BigInt(value.units) + units).toString(),
    })
    const satsChange = ASSET_CARRIER_SATS - quote.give.amount
    const expected = {
      trader: delta(before.trader, satsChange, quote.take.amount),
      solver: delta(before.solver, -satsChange, -quote.take.amount),
      taxi: before.taxi,
    }
    await poll(
      ledger,
      (actual) => JSON.stringify(actual) === JSON.stringify(expected),
      'exact three-party conservation',
    )
    assert.deepEqual(await ids(), previousAdvances)
    assert.equal(sends, 1)
    assert.equal(submits, 1)
    const evidence = {
      namespace,
      source,
      sdkVersion: sdkPackage.version,
      swapVersion: swapPackage.version,
      cohort: manifest.artifacts.map(({ package: name, version, sha256, source }) => ({
        package: name,
        version,
        sha256,
        source,
      })),
      quoteId: quote.id,
      originalTxid,
      sends,
      submits,
      emptyReads,
      fundingRequest,
      reopenedDatabase: true,
      originalOfferUnchanged: true,
      adoptedOriginalTxid: true,
      before,
      after: expected,
    }
    await writeFile(
      resolve(walletRoot, '.local-tests/native-evidence', namespace, 'same-quote-funding.json'),
      JSON.stringify(evidence, null, 2),
    )
    console.log(
      JSON.stringify({
        sameQuoteFundingProof: 'passed',
        namespace,
        sends,
        submits,
        emptyReads,
        originalTxid,
      }),
    )
    return evidence
  } catch (error) {
    failed = true
    console.error(
      JSON.stringify({
        sameQuoteFundingProof: 'failed',
        namespace,
        stage,
        sends,
        submits,
        emptyReads,
        error: error?.name ?? 'Error',
      }),
    )
    throw error
  } finally {
    let cleanupFailures = 0
    for (const resource of [client, repository, wallet]) {
      try {
        await resource?.[Symbol.asyncDispose]()
      } catch {
        cleanupFailures++
      }
    }
    if (cleanupFailures) {
      console.error(JSON.stringify({ sameQuoteFundingCleanupFailures: cleanupFailures, namespace }))
      if (!failed) throw new Error('Funding proof resource shutdown failed')
    }
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  runFundingProof(process.argv[2], process.argv[3]).catch(() => {
    process.exitCode = 1
  })
