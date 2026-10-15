import { execFile } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseEnv, promisify } from 'node:util'
import { nativeRegistry } from './taxi-native-registry.mjs'
import { cleanupOwnedStages } from './taxi-native-ci.mjs'
import { endpoint, loadNativeEnv, requiredValue, sanitizedError } from './taxi-native-env.mjs'

const run = promisify(execFile)
const walletRoot = process.cwd()
let env = process.env
let context
try {
  env = loadNativeEnv({ required: true, fixture: false })
  const root = resolve(requiredValue(env, 'TAXI_NATIVE_SOLVER_ROOT'))
  env = { ...env, ...parseEnv(await readFile(requiredValue(env, 'TAXI_NATIVE_SOLVER_ENV_FILE'), 'utf8')) }
  Object.assign(process.env, env)
  const fixtureFile = resolve(walletRoot, requiredValue(env, 'TAXI_NATIVE_REGTEST_FIXTURE_FILE'))
  await readFile(resolve(walletRoot, requiredValue(env, 'TAXI_REGTEST_ENV_FILE')), 'utf8')
  process.chdir(root)
  const assetId = requiredValue(env, 'TAXI_NATIVE_RFQ_ASSET_ID')
  if (!/^[0-9a-f]{68}$/.test(assetId)) throw new Error('Native fixture asset ID must be 68 lowercase hex characters')
  const units = env.TAXI_NATIVE_RFQ_ATOMIC_UNITS ?? '1000'
  const fare = env.TAXI_NATIVE_RFQ_FARE_SATS ?? '7'
  if (!/^[1-9][0-9]*$/.test(units) || !/^(0|[1-9][0-9]*)$/.test(fare))
    throw new Error('Native fixture amounts must be canonical integers')
  const feedUrl = endpoint(env, 'TAXI_NATIVE_PRICE_FEED_URL')
  const relayUrl = endpoint(env, 'TAXI_NATIVE_ADVERTISED_RELAY_URL', ['wss:'])
  const arkUrl = endpoint(env, 'TAXI_REGTEST_ARKD_URL')
  const taxiUrl = endpoint(env, 'TAXI_REGTEST_URL')
  endpoint(env, 'TAXI_REGTEST_ADMIN_URL')
  if (
    env.SWAP_NETWORK !== 'regtest' ||
    endpoint(env, 'ARK_SERVER_URL') !== arkUrl ||
    endpoint(env, 'TAXI_URL') !== taxiUrl
  )
    throw new Error('Solver and wallet must use the same explicit regtest Arkade and Taxi endpoints')
  if (
    env.TAXI_RECEIVER_ALLOW_PRIVATE !== '1' ||
    !env.ASSET_MARKETS?.split(',')
      .map((market) => market.trim())
      .includes(`ARFQ:${assetId}`)
  )
    throw new Error('Solver env must enable the local Taxi and name ARFQ for this exact asset')
  if (!/^0[23][0-9a-f]{64}$/.test(requiredValue(env, 'VITE_EMULATOR_PUBKEY')))
    throw new Error('VITE_EMULATOR_PUBKEY must be the actual compressed emulator key')
  /** @param {string} path */
  const fromSolver = (path) => import(pathToFileURL(resolve(root, path)).href)
  const require = createRequire(resolve(root, 'packages/solver-app/package.json'))
  const sdkFile = require.resolve('@arkade-os/sdk')
  const sdkPackage = JSON.parse(await readFile(resolve(dirname(sdkFile), '../package.json'), 'utf8'))
  if (!sdkPackage.version.startsWith('0.5.')) throw new Error('Install the frozen SDK0.5 producer in the solver first')
  const [{ loadConfig }, { createArkadeContext }, { AdminStore }, { resolveDbLayout }, { DEFAULT_SERVING }] =
    await Promise.all([
      fromSolver('packages/solver-app/dist/config.js'),
      fromSolver('packages/solver-arkade/dist/arkade/wallet.js'),
      fromSolver('packages/solver-app/dist/admin/db.js'),
      fromSolver('packages/solver-corridors/dist/db/layout.js'),
      fromSolver('packages/solver-core/dist/core/assetMarketConfig.js'),
    ])
  const config = loadConfig()
  if (config.assetQuoteValiditySeconds <= 30)
    throw new Error(
      'Set ASSET_QUOTE_VALIDITY_SECONDS above 30 so the native 30-second safety margin leaves a funding window',
    )
  context = await createArkadeContext(config.arkade)
  const details = await context.wallet.indexerProvider.getAssetDetails(assetId)
  const decimals = details.metadata?.decimals
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 8)
    throw new Error('Minted ARFQ metadata must declare decimals in 0..8')
  /** @type {Awaited<ReturnType<import('@arkade-os/sdk').IReadonlyWallet['getSpendableVtxos']>>} */
  const coins = await context.wallet.getSpendableVtxos({ withRecoverable: false, genericallySpendableOnly: true })
  const held = coins
    .flatMap((coin) => coin.assets ?? [])
    .filter((entry) => entry.assetId === assetId)
    .reduce((sum, entry) => sum + BigInt(entry.amount), 0n)
  if (held < BigInt(units) * 2n || !coins.some((coin) => coin.value > 0))
    throw new Error('Fund the current solver with spendable ARFQ for both browser checks and sats first')
  const solverAddress = await context.wallet.getAddress()
  const discoveryPubkey = Buffer.from(await context.identity.xOnlyPublicKey()).toString('hex')
  const adminPath = resolveDbLayout(config.swapDbPath).admin
  await mkdir(dirname(adminPath), { recursive: true })
  const admin = await AdminStore.open(adminPath)
  try {
    await admin.putMarket({
      ...DEFAULT_SERVING,
      symbol: 'ARFQ',
      base: null,
      quote: assetId,
      baseDecimals: 8,
      quoteDecimals: decimals,
      feedUrl,
      pricePath: env.TAXI_NATIVE_PRICE_PATH ?? '/price',
      toleranceBps: 0,
      feeBps: 0,
      sellBase: { min: 1n, max: 1_000_000_000n },
      buyBase: { min: 1n, max: 1_000_000_000n },
      enabled: true,
    })
  } finally {
    await admin.close()
  }
  const { stdout: rawCard } = await run(
    process.execPath,
    [resolve(root, 'packages/solver-app/dist/cli.js'), 'card', 'wallet-native'],
    {
      cwd: root,
      windowsHide: true,
      timeout: 60_000,
      env: { ...env, RELAY_URL: relayUrl, SOLVER_CARD_RELAYS: '' },
    },
  )
  const { stdout: head } = await run('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })
  const index = nativeRegistry(rawCard, { assetId, discoveryPubkey, feedUrl, relayUrl, commit: head.trim() })
  const writes = [
    [resolve(walletRoot, 'public/solver-registry/wallet-native.card.json'), rawCard],
    [resolve(walletRoot, 'public/solver-registry/regtest.json'), JSON.stringify(index, null, 2)],
    [resolve(walletRoot, 'public/asset-registry/regtest.json'), JSON.stringify([assetId])],
    [
      fixtureFile,
      JSON.stringify(
        {
          TAXI_NATIVE_RFQ_ASSET_ID: assetId,
          TAXI_NATIVE_RFQ_SOLVER_ADDRESS: solverAddress,
          TAXI_NATIVE_RFQ_ATOMIC_UNITS: units,
          TAXI_NATIVE_RFQ_FARE_SATS: fare,
        },
        null,
        2,
      ),
    ],
  ]
  for (const [path, data] of writes) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, data, 'utf8')
  }
  console.log(
    'Native Taxi fixture and signed wallet-native registry prepared; start the solver with the same private env',
  )
} catch (error) {
  console.error(sanitizedError(error, env))
  process.exitCode = 1
} finally {
  process.chdir(walletRoot)
  for (const failure of await cleanupOwnedStages({ context })) {
    console.error(sanitizedError(new Error(failure), env))
    process.exitCode = 1
  }
}
