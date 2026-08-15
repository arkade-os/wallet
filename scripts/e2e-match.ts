#!/usr/bin/env node --experimental-strip-types
/**
 * Two wallets, one order book, one real match — end to end against regtest.
 *
 *   node --experimental-strip-types scripts/e2e-match.ts
 *   node --experimental-strip-types scripts/e2e-match.ts --json
 *
 * Prerequisites — docker must be running, then:
 *
 *   git submodule update --init regtest
 *   pnpm regtest:start
 *
 * That brings up arkd on :7070, the covenant emulator on :7073, and mempool's
 * esplora-compatible REST on :3000/api. Funding comes from arkd's own faucet
 * over `docker exec`, exactly as scripts/seed-book.mjs does it.
 *
 * The claim under test is not "these calls return without throwing" — a broken
 * fill throws nothing, it just moves the wrong money. So every step asserts a
 * fact that is false when the feature is broken:
 *
 *   discovery   B finds A's ask on the /v1/txs stream and its size matches what
 *               A posted. Sizing an asset order from its 330-sat carrier instead
 *               of the funding tx's asset packet is a real bug this repo has
 *               shipped; the ask is deliberately nothing like dust so it cannot
 *               pass by coincidence.
 *   the match   A's sats went UP by the amount it asked for, B's asset balance
 *               went up by the amount A sold, and the covenant vtxo is no longer
 *               spendable — checked live BEFORE the take too, so "already gone"
 *               cannot be mistaken for "gone because it filled".
 *
 * The reverse direction (taking a bid) is a KNOWN GAP: src/lib/book/trade.ts
 * refuses it rather than half-building a spend that could burn asset balance.
 * Step 7 asserts the refusal by its exact message, so implementing bid-taking
 * fails this test loudly instead of leaving a direction silently unproven.
 *
 * Env: ARK_URL, EMULATOR_URL, ESPLORA_URL, NETWORK — defaults are the stack's.
 */
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { hex } from '@scure/base'
// Browsers have EventSource; node does not, and the SDK's tx stream is SSE.
// Without this, every stream read below dies on EventSourceUnavailableError.
import { EventSource } from 'eventsource'
import {
  configureEventSource,
  EsploraProvider,
  InMemoryContractRepository,
  InMemoryWalletRepository,
  RestArkProvider,
  RestEmulatorProvider,
  RestIndexerProvider,
  SingleKey,
  Wallet,
  type NetworkName,
} from '@arkade-os/sdk'
import { BTC_ASSET_ID } from '@arkade-os/swap'
import {
  buildBook,
  deadOrders,
  pairKeyOf,
  pairKeyOfOrder,
  placeOrder,
  readBook,
  takeOrder,
  type BookDeps,
  type BookOrder,
} from '../src/lib/book/index.ts'

configureEventSource((url: string) => new EventSource(url) as never)

const ARK_URL = process.env.ARK_URL ?? 'http://localhost:7070'
const EMULATOR_URL = process.env.EMULATOR_URL ?? 'http://localhost:7073'
const ESPLORA_URL = process.env.ESPLORA_URL ?? 'http://localhost:3000/api'
const NETWORK = (process.env.NETWORK ?? 'regtest') as NetworkName
// The regtest stack advertises a 512s checkpoint exit delay, below the SDK's
// 1200s policy floor, so Wallet.create refuses it outright. The wallet app
// carries the same kind of override for mutinynet (see
// mutinynetMinCheckpointExitDelaySeconds in src/lib/constants.ts). Override via
// MIN_CHECKPOINT_EXIT_DELAY when pointing these scripts at another deployment.
const MIN_CHECKPOINT_EXIT_DELAY = BigInt(process.env.MIN_CHECKPOINT_EXIT_DELAY ?? 512)

// 0 decimals so every number printed and asserted below is the number a human
// would say. None of these is near the 330-sat dust carrier, on purpose.
const SUPPLY = 1_000_000n
const ASK_ASSET = 1_000n // A deposits this much asset
const ASK_SATS = 25_000n // ...and will only release it for this many sats
const BID_SATS = 10_000n // B later deposits this many sats
const BID_ASSET = 500n // ...wanting this much asset back
const FAUCET_SATS = 200_000 // per wallet, comfortably over both legs plus fees

const json = process.argv.includes('--json')

const out = (event: string, data: Record<string, unknown>, human: string) => {
  // bigints are everywhere in this module and JSON.stringify throws on them
  if (json) console.log(JSON.stringify({ event, ...data }, (_, v) => (typeof v === 'bigint' ? v.toString() : v)))
  else console.log(human)
}

/** Both wallets hold open server subscriptions, so node will not exit on its
 * own. Flush first — a piped stdout is asynchronous on macOS, and a bare
 * process.exit would cut off the line that says why. */
const exit = (code: number) => process.stdout.write('', () => process.exit(code))

const die = (err: unknown) => {
  if (json) console.log(JSON.stringify({ event: 'error', message: err instanceof Error ? err.message : String(err) }))
  // the whole error, not just its message: an AssertionError carries the actual
  // and expected values, which is the entire diagnosis
  else console.error(err)
  exit(1)
}

let stepNo = 0
const step = (name: string, data: Record<string, unknown> = {}) => {
  stepNo += 1
  out('step', { step: stepNo, name, ...data }, `ok ${stepNo}  ${name}`)
}

// ── the stack ────────────────────────────────────────────────────────────────

const sh = (cmd: string) =>
  execSync(cmd, { encoding: 'utf8' })
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => !l.includes('WARN'))
    .join('\n')
    .trim()

/** arkd's faucet: mint a note, redeem it into arkd's own ark wallet, pay out.
 * The note is minted larger than the payout so arkd can cover its own fees. */
const fund = (address: string, sats: number) => {
  const note = sh(`docker exec -t arkd arkd note --amount ${sats + 100_000}`)
  sh(`docker exec -t arkd ark redeem-notes -n ${note} --password secret`)
  sh(`docker exec -t arkd ark send --to ${address} --amount ${sats} --password secret`)
}

/** Bounded wait for a value some component has not produced yet. Every poll
 * here is against local state or an indexer read — the book itself is pushed. */
const until = async <T>(what: string, fn: () => Promise<T | undefined>, timeoutMs = 120_000): Promise<T> => {
  const start = Date.now()
  for (;;) {
    const value = await fn()
    if (value !== undefined) return value
    if (Date.now() - start > timeoutMs) throw new Error(`timed out after ${timeoutMs}ms waiting for ${what}`)
    await new Promise((r) => setTimeout(r, 500))
  }
}

const newWallet = () =>
  Wallet.create({
    identity: SingleKey.fromRandomBytes(),
    arkServerUrl: ARK_URL,
    onchainProvider: new EsploraProvider(ESPLORA_URL, { forcePolling: true, pollingInterval: 2000 }),
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
    },
    settlementConfig: false,
    minCheckpointExitDelaySeconds: MIN_CHECKPOINT_EXIT_DELAY,
  })

/** Spendable sats. Deliberately `available` and not `total`: a funded covenant
 * is registered as escrow on the maker's own wallet, so it lands in `total` and
 * a delta read there would count the maker's own deposit as income. */
const satsOf = async (w: Wallet) => BigInt((await w.getBalance()).available)

const heldAsset = async (w: Wallet, assetId: string) =>
  (await w.getBalance()).assets.find((a) => a.assetId === assetId)?.amount ?? 0n

/** x-only, from whatever shape the endpoint served — a compressed key loses its
 * parity byte. Used for two DIFFERENT keys; see main(). */
const xOnly = (key: string): Uint8Array => {
  const bytes = hex.decode(key)
  if (bytes.length === 32) return bytes
  if (bytes.length !== 33) throw new Error(`expected a 32 or 33 byte pubkey, got ${bytes.length}`)
  return bytes.slice(1)
}

/**
 * One reader for both wallets.
 *
 * `readBook` follows arkd's global transaction stream, so it is not per-wallet:
 * B seeing A's ask and A seeing B's bid are the same subscription. It must be
 * started BEFORE anything is posted — the stream reports what happens while it
 * is open and nothing before it, so a reader opened afterwards sees an empty
 * book and this whole test would pass on a timeout instead of a discovery.
 */
const startReader = (emulatorPubkey: Uint8Array) => {
  const controller = new AbortController()
  const orders = new Map<string, BookOrder>()

  const done = readBook({
    arkProvider: new RestArkProvider(ARK_URL),
    emulatorPubkey,
    signal: controller.signal,
    liveIds: () => new Set(orders.keys()),
    onOrder: (order) => orders.set(order.id, order),
    onGone: (ids) => {
      for (const id of ids) orders.delete(id)
    },
    onError: (err) => out('stream_error', { message: String(err) }, `stream error: ${err}`),
  })

  return {
    /** The order funded by `txid`, once the stream has reported it — the whole
     * point being that nobody hands it over; it is found. */
    discover: (txid: string, what: string) =>
      until(what, async () => [...orders.values()].find((o) => o.fundingTxid === txid)),
    stop: async () => {
      controller.abort()
      await done
    },
  }
}

// ── the test ─────────────────────────────────────────────────────────────────

const main = async () => {
  const [arkInfo, emulatorInfo] = await Promise.all([
    new RestArkProvider(ARK_URL).getInfo(),
    new RestEmulatorProvider(EMULATOR_URL).getInfo(),
  ])

  // Two different keys, and confusing them is the classic failure here: the
  // covenant is rebuilt against the ARK signer and co-signed by the EMULATOR
  // signer. The regtest emulator generates a fresh key per deployment, so both
  // are read at runtime rather than pinned.
  const serverPubkey = xOnly(arkInfo.signerPubkey)
  const emulatorPubkey = xOnly(emulatorInfo.signerPubkey)
  assert.notEqual(
    hex.encode(serverPubkey),
    hex.encode(emulatorPubkey),
    'ark and emulator signers must differ — reading the same key twice would make the covenant checks vacuous',
  )

  const indexer = new RestIndexerProvider(ARK_URL)
  const dust = BigInt(arkInfo.dust)

  // 1 ── two funded wallets
  const [a, b] = await Promise.all([newWallet(), newWallet()])
  const depsA: BookDeps = { wallet: a, arkServerUrl: ARK_URL, network: NETWORK, dust }
  const depsB: BookDeps = { wallet: b, arkServerUrl: ARK_URL, network: NETWORK, dust }
  const [addressA, addressB] = await Promise.all([a.getAddress(), b.getAddress()])

  fund(addressA, FAUCET_SATS)
  fund(addressB, FAUCET_SATS)
  await until('A to see the faucet', async () => ((await a.getVtxos()).length > 0 ? true : undefined))
  await until('B to see the faucet', async () => ((await b.getVtxos()).length > 0 ? true : undefined))
  step(`two wallets funded with ${FAUCET_SATS} sats each`, { a: addressA, b: addressB })

  // 2 ── A issues the asset it is about to sell
  const { assetId } = await a.assetManager.issue({
    amount: SUPPLY,
    metadata: { name: 'E2E Match', ticker: 'E2E', decimals: 0 },
  })
  const issued = await until('A to be credited its issuance', async () => {
    const amount = await heldAsset(a, assetId)
    return amount > 0n ? amount : undefined
  })
  assert.equal(issued, SUPPLY, 'A must hold exactly the supply it issued')
  step(`A issued ${SUPPLY} E2E`, { assetId })

  // Before the first post, never after: see startReader.
  const reader = startReader(emulatorPubkey)

  // 3 ── A posts an ask: gives the asset, wants sats
  const ask = await placeOrder(depsA, {
    give: { assetId, amount: ASK_ASSET },
    want: { assetId: BTC_ASSET_ID, amount: ASK_SATS },
    emulatorPubkey: emulatorInfo.signerPubkey,
  })
  step(`A posted an ask: ${ASK_ASSET} E2E -> ${ASK_SATS} sats`, { txid: ask.fundingTxid, script: ask.swapPkScript })

  // 4 ── B discovers it off the stream, not from A
  const found = await reader.discover(ask.fundingTxid, "B to see A's ask on the tx stream")
  assert.equal(found.swapPkScript, ask.swapPkScript, 'discovered order must be the covenant A funded')
  assert.equal(found.give.assetId, assetId, 'discovered ask must give the issued asset')
  // The guard that matters: an asset order sized from its sat carrier instead of
  // the funding tx's asset packet reads as 330 here, not ASK_ASSET.
  assert.equal(found.give.amount, ASK_ASSET, 'discovered ask must give exactly what A posted')
  assert.notEqual(found.give.amount, found.depositSats, 'give.amount must be the asset, never its sat carrier')
  assert.equal(found.want.assetId, BTC_ASSET_ID, 'discovered ask must want sats')
  assert.equal(found.want.amount, ASK_SATS, 'discovered ask must want exactly the price A named')

  const pair = pairKeyOf(assetId, BTC_ASSET_ID)
  assert.equal(pairKeyOfOrder(found), pair, 'the order must land on the E2E/btc pair')
  const book = buildBook([found], pair, new Set())
  assert.equal(book.asks.length, 1, 'a sale of the asset must build as an ask')
  assert.equal(book.bids.length, 0, 'a sale of the asset must not build as a bid')
  step('B discovered the ask off the tx stream', {
    id: found.id,
    give: `${found.give.amount} E2E`,
    want: `${found.want.amount} sats`,
    carrier: found.depositSats,
  })

  // 5 ── B takes it
  // Checked live first, so step 6's "it's gone" cannot pass against an order
  // that was never findable at this script in the first place.
  assert.deepEqual(await deadOrders(indexer, [found]), [], 'the ask must be resting before anyone takes it')
  const satsBefore = await satsOf(a)
  const fillTxid = await takeOrder(depsB, { order: found, serverPubkey, emulatorUrl: EMULATOR_URL })
  step('B took the ask', { txid: fillTxid })

  // 6 ── the match actually happened
  // A is paid on output 0 of the fill and learns of it on its own subscription,
  // so wait for the credit rather than reading the balance straight away.
  const satsAfter = await until('A to be paid for its ask', async () => {
    const now = await satsOf(a)
    return now > satsBefore ? now : undefined
  })
  const delta = satsAfter - satsBefore
  // The covenant enforces at least ASK_SATS to A's script, but A's own fees ride
  // the same balance, so the floor is 90% — and the exact delta is printed. A
  // fill that paid dust cannot hide under this.
  assert.ok(delta * 10n >= ASK_SATS * 9n, `A gained ${delta} sats, which is under 90% of the ${ASK_SATS} it asked for`)

  const bought = await until('B to be credited the asset', async () => {
    const amount = await heldAsset(b, assetId)
    return amount > 0n ? amount : undefined
  })
  assert.equal(bought, ASK_ASSET, 'B must hold exactly the asset amount A sold')
  assert.equal(await heldAsset(a, assetId), SUPPLY - ASK_ASSET, 'A must be down exactly what it sold')

  // deadOrders is the same reconciliation the wallet runs: getVtxos({ scripts:
  // [swapPkScript], spendableOnly: true }) no longer carries the funding txid.
  const gone = await until('the covenant vtxo to stop being spendable', async () => {
    const ids = await deadOrders(indexer, [found])
    return ids.length > 0 ? ids : undefined
  })
  assert.deepEqual(gone, [found.id], 'the taken order must be the one that left the book')
  step('the match is real', {
    aGainedSats: delta,
    aAskedSats: ASK_SATS,
    bGainedAsset: bought,
    orderGone: found.id,
  })

  // 7 ── the reverse: B posts a bid, A cannot take it
  const bid = await placeOrder(depsB, {
    give: { assetId: BTC_ASSET_ID, amount: BID_SATS },
    want: { assetId, amount: BID_ASSET },
    emulatorPubkey: emulatorInfo.signerPubkey,
  })
  const foundBid = await reader.discover(bid.fundingTxid, "A to see B's bid on the tx stream")
  assert.equal(foundBid.give.assetId, BTC_ASSET_ID, 'discovered bid must give sats')
  assert.equal(foundBid.give.amount, BID_SATS, 'discovered bid must give exactly what B deposited')
  assert.equal(foundBid.want.assetId, assetId, 'discovered bid must want the asset')
  assert.equal(foundBid.want.amount, BID_ASSET, 'discovered bid must want exactly what B named')
  assert.equal(buildBook([foundBid], pair, new Set()).bids.length, 1, 'a purchase of the asset must build as a bid')

  // NOT a passing direction. takeOrder refuses bids today, so the honest
  // assertion is the refusal itself — by its exact message, so that a future
  // implementation of bid-taking fails here and forces this step to be rewritten
  // as a real match rather than quietly continuing to "pass".
  await assert.rejects(
    () => takeOrder(depsA, { order: foundBid, serverPubkey, emulatorUrl: EMULATOR_URL }),
    /taking a bid is not supported yet/,
    'takeOrder must refuse a bid; if it now succeeds, the gap is closed and this step owes a real match assertion',
  )
  step('A could NOT take the bid — refused, as designed today', { id: foundBid.id })
  out(
    'known_gap',
    {
      feature: 'take a bid',
      where: 'src/lib/book/trade.ts',
      order: foundBid.id,
      message: 'taking a bid is not supported yet',
    },
    `\nKNOWN GAP  taking a bid is not supported (src/lib/book/trade.ts).\n` +
      `           The ask direction above is a proven match; the bid direction is\n` +
      `           NOT proven — only its refusal is. Meeting a bid means posting an\n` +
      `           ask against it. Implement bid-taking and step 7 fails on purpose.`,
  )

  await reader.stop()
  await Promise.all([a.dispose(), b.dispose()])
  out(
    'done',
    { steps: stepNo, assetId, fillTxid, restingBid: foundBid.id },
    `\n${stepNo} steps passed. one match, one known gap.`,
  )
}

main().then(() => exit(0), die)
