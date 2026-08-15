#!/usr/bin/env node --experimental-strip-types
/**
 * The order book from a terminal — and from an agent.
 *
 *   node --experimental-strip-types scripts/book.ts watch --seconds 30
 *   node --experimental-strip-types scripts/book.ts post --give btc:5000 --want <assetId>:100000000
 *   node --experimental-strip-types scripts/book.ts take <txid>:<vout>
 *   node --experimental-strip-types scripts/book.ts pull <txid>:<vout>
 *
 * This exists to prove a claim the wallet alone cannot: everything under
 * `src/lib/book/` is portable. No React, no DOM, no bundler, no build step, and
 * no dependency this repo did not already have — node resolves the module
 * directly because its imports carry `.ts` specifiers, the same convention
 * `@arkade-os/solver-discovery` uses to stay runnable everywhere.
 *
 * Pass `--json` to any command and every line of output becomes one JSON object,
 * which is the mode an agent should drive: no prose, no tables, one object per
 * event or result, errors included.
 *
 * Env:
 *   ARK_URL          arkd            (default http://localhost:7070)
 *   ESPLORA_URL      esplora REST    (default http://localhost:3000/api)
 *   NETWORK          regtest | mutinynet | bitcoin | signet | testnet (default regtest)
 *   SEED_KEY         hex private key for the wallet this acts as (required except for `watch`)
 *   EMULATOR_PUBKEY  covenant co-signer, compressed or x-only hex (required)
 *   EMULATOR_URL     emulator endpoint; only `take` needs it
 */
import { hex } from '@scure/base'
// Browsers have EventSource; node does not, and the SDK's stream is SSE. Without
// this every command that follows the stream dies on EventSourceUnavailableError
// — which is exactly what happened the first time this script met a real server.
import { EventSource } from 'eventsource'
import {
  configureEventSource,
  EsploraProvider,
  InMemoryContractRepository,
  InMemoryWalletRepository,
  RestArkProvider,
  RestIndexerProvider,
  SingleKey,
  Wallet,
  type NetworkName,
} from '@arkade-os/sdk'
import { cancelOffer, InMemoryAssetSwapRepository } from '@arkade-os/swap'
import {
  buildBook,
  displayPrice,
  pairKeyOf,
  pairsOf,
  placeOrder,
  readBook,
  takeOrder,
  type BookOrder,
} from '../src/lib/book/index.ts'

configureEventSource((url: string) => new EventSource(url) as never)

const ARK_URL = process.env.ARK_URL ?? 'http://localhost:7070'
const ESPLORA_URL = process.env.ESPLORA_URL ?? 'http://localhost:3000/api'
const NETWORK = (process.env.NETWORK ?? 'regtest') as NetworkName
// The regtest stack advertises a 512s checkpoint exit delay, below the SDK's
// 1200s policy floor, so Wallet.create refuses it outright. The wallet app
// carries the same kind of override for mutinynet (see
// mutinynetMinCheckpointExitDelaySeconds in src/lib/constants.ts). Override via
// MIN_CHECKPOINT_EXIT_DELAY when pointing these scripts at another deployment.
const MIN_CHECKPOINT_EXIT_DELAY = BigInt(process.env.MIN_CHECKPOINT_EXIT_DELAY ?? 512)

const argv = process.argv.slice(2)
const command = argv[0]
const json = argv.includes('--json')

const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}

const out = (event: string, data: Record<string, unknown>, human: string) => {
  if (json) console.log(JSON.stringify({ event, ...data }))
  else console.log(human)
}

const die = (message: string): never => {
  if (json) console.log(JSON.stringify({ event: 'error', message }))
  else console.error(message)
  process.exit(1)
}

/** x-only, whatever shape the env gave us — a compressed key loses its parity byte. */
const emulatorPubkey = (): Uint8Array => {
  const raw = process.env.EMULATOR_PUBKEY
  if (!raw) die('EMULATOR_PUBKEY is required (compressed or x-only hex)')
  const key = hex.decode(raw!)
  if (key.length === 33) return key.slice(1)
  if (key.length !== 32) die('EMULATOR_PUBKEY must be 32 or 33 bytes')
  return key
}

/** `<assetId>:<atomicAmount>`, where the asset id may be the literal `btc`. */
const leg = (spec: string | undefined, name: string): { assetId: string; amount: bigint } => {
  if (!spec) die(`--${name} is required, as <assetId>:<atomicAmount>`)
  const at = spec!.lastIndexOf(':')
  if (at <= 0) die(`--${name} must be <assetId>:<atomicAmount>`)
  const assetId = spec!.slice(0, at)
  let amount: bigint
  try {
    amount = BigInt(spec!.slice(at + 1))
  } catch {
    return die(`--${name} amount must be an integer in atomic units`)
  }
  return { assetId, amount }
}

const openWallet = async () => {
  const key = process.env.SEED_KEY
  if (!key) die('SEED_KEY is required for this command')
  return Wallet.create({
    identity: SingleKey.fromHex(key!),
    arkServerUrl: ARK_URL,
    onchainProvider: new EsploraProvider(ESPLORA_URL, { forcePolling: true, pollingInterval: 2000 }),
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
    },
    settlementConfig: false,
    minCheckpointExitDelaySeconds: MIN_CHECKPOINT_EXIT_DELAY,
  })
}

const serverPubkey = async (): Promise<Uint8Array> => {
  const info = await new RestArkProvider(ARK_URL).getInfo()
  // x-only, matching the key the covenants were funded against
  return hex.decode(info.signerPubkey).slice(1)
}

const depsFor = async () => {
  const wallet = await openWallet()
  const info = await new RestArkProvider(ARK_URL).getInfo()
  return { wallet, arkServerUrl: ARK_URL, network: NETWORK, dust: BigInt(info.dust) }
}

// ── commands ─────────────────────────────────────────────────────────────────

/**
 * Follow the book for a bounded window.
 *
 * There is no backfill to fetch: the stream reports what happens while it is
 * open and nothing before it, and the indexer cannot enumerate covenant scripts
 * nobody has named yet. So a fresh watcher starts empty and fills in. That is a
 * property of the design, not a gap this command papers over — it prints what
 * it saw and says so.
 */
const watch = async () => {
  const seconds = Number(flag('seconds') ?? 30)
  // resolve config BEFORE announcing, so a consumer never reads "watching"
  // followed by a config error for a watch that never started
  const emulator = emulatorPubkey()
  const orders = new Map<string, BookOrder>()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), seconds * 1000)

  out(
    'watching',
    { seconds, arkUrl: ARK_URL },
    `watching ${ARK_URL} for ${seconds}s — rows appear as they are funded\n`,
  )

  await readBook({
    arkProvider: new RestArkProvider(ARK_URL),
    emulatorPubkey: emulator,
    signal: controller.signal,
    liveIds: () => new Set(orders.keys()),
    onOrder: (order) => {
      orders.set(order.id, order)
      out(
        'order',
        {
          id: order.id,
          give: `${order.give.assetId}:${order.give.amount}`,
          want: `${order.want.assetId}:${order.want.amount}`,
        },
        `+ ${order.id}  ${order.give.amount} ${short(order.give.assetId)} -> ${order.want.amount} ${short(order.want.assetId)}`,
      )
    },
    onGone: (ids) => {
      for (const id of ids) orders.delete(id)
      out('gone', { ids }, ids.map((id) => `- ${id}`).join('\n'))
    },
    onError: (err) => out('stream_error', { message: String(err) }, `stream error: ${err}`),
  })
  clearTimeout(timer)

  const all = [...orders.values()]
  if (json) {
    console.log(JSON.stringify({ event: 'book', pairs: pairsOf(all), orders: all.map(serializable) }))
    return
  }
  for (const { pairKey } of pairsOf(all)) print(buildBook(all, pairKey, new Set()), pairKey)
  if (all.length === 0) console.log('\nnothing rested in that window.')
}

const post = async () => {
  const give = leg(flag('give'), 'give')
  const want = leg(flag('want'), 'want')
  const placed = await placeOrder(await depsFor(), {
    give,
    want,
    emulatorPubkey: process.env.EMULATOR_PUBKEY,
  })
  out(
    'posted',
    { ...placed },
    `posted ${give.amount} ${short(give.assetId)} -> ${want.amount} ${short(want.assetId)}\n` +
      `  txid    ${placed.fundingTxid}\n  offer   ${placed.offerHex}`,
  )
}

/** Take and pull both name a row by outpoint, so both need it resolved first. */
const findOrder = async (id: string): Promise<BookOrder> => {
  const seconds = Number(flag('seconds') ?? 20)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), seconds * 1000)
  let found: BookOrder | undefined

  await readBook({
    arkProvider: new RestArkProvider(ARK_URL),
    emulatorPubkey: emulatorPubkey(),
    signal: controller.signal,
    liveIds: () => new Set(),
    onOrder: (order) => {
      if (order.id !== id) return
      found = order
      controller.abort()
    },
    onGone: () => {},
  })

  if (!found) die(`did not see ${id} on the stream within ${seconds}s — it may predate this watch`)
  return found!
}

const take = async () => {
  const id = argv[1]
  if (!id) die('usage: take <txid>:<vout>')
  const emulatorUrl = process.env.EMULATOR_URL
  if (!emulatorUrl) die('EMULATOR_URL is required to take an order — fulfill is a covenant spend')

  const order = await findOrder(id!)
  const txid = await takeOrder(await depsFor(), {
    order,
    serverPubkey: await serverPubkey(),
    emulatorUrl: emulatorUrl!,
  })
  out('taken', { id, txid }, `took ${id}\n  txid  ${txid}`)
}

const pull = async () => {
  const id = argv[1]
  if (!id) die('usage: pull <txid>:<vout>')
  const order = await findOrder(id!)
  const wallet = await openWallet()
  const txid = await cancelOffer(wallet, ARK_URL, order.offerHex, {
    repository: new InMemoryAssetSwapRepository(),
    fundingTxid: order.fundingTxid,
    swapAddress: order.swapPkScript,
  })
  out('pulled', { id, txid }, `pulled ${id}\n  txid  ${txid}`)
}

// ── output helpers ───────────────────────────────────────────────────────────

const short = (assetId: string) => (assetId === 'btc' ? 'sats' : `${assetId.slice(0, 8)}…`)

const serializable = (o: BookOrder) => ({
  ...o,
  give: { assetId: o.give.assetId, amount: o.give.amount.toString() },
  want: { assetId: o.want.assetId, amount: o.want.amount.toString() },
  depositSats: o.depositSats.toString(),
})

const print = (book: ReturnType<typeof buildBook>, pairKey: string) => {
  // Decimals are asset metadata this command does not fetch, so prices print in
  // atomic terms. Naming that beats printing a number that looks like a human
  // price and is off by 10^decimals.
  const px = (r: { price: { num: bigint; den: bigint } }) => displayPrice(r.price, 0, 0).toPrecision(8)
  console.log(`\n  ${short(pairKey.split('/')[0])}/sats        quote-atomic per base-atomic`)
  for (const a of [...book.asks].reverse()) console.log(`    ask   ${a.give.amount}`.padEnd(28) + px(a))
  console.log(book.spread ? `    ————— spread —————` : `    ————— crossed —————`)
  for (const b of book.bids) console.log(`    bid   ${b.want.amount}`.padEnd(28) + px(b))
}

const commands: Record<string, () => Promise<void>> = { watch, post, take, pull }

const run = commands[command ?? '']
if (!run) {
  console.error('usage: book.ts <watch|post|take|pull> [--json]')
  process.exit(1)
}
run().catch((err) => die(err instanceof Error ? err.message : String(err)))
