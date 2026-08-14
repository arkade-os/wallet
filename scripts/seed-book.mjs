#!/usr/bin/env node
/**
 * Post a two-sided standing book on regtest.
 *
 *   node scripts/seed-book.mjs --dry-run     # print the book, touch nothing
 *   pnpm regtest:start && node scripts/seed-book.mjs
 *
 * There is nothing to render an order book against until somebody rests orders
 * on both sides of a pair, and no solver does that here — the book is built
 * from user offers, so it has to be seeded by a user. This is that user.
 *
 * It issues an asset, then funds N standing offers per side around a mid price:
 * asks deposit the asset and want sats, bids deposit sats and want the asset.
 * Both sides carry the SAME asset size per rung, so the seeded position nets
 * out — if the whole book filled, the asset balance would return to where it
 * started and the only change would be the spread, in sats. That is what makes
 * it a book rather than a directional bet, and `--dry-run` asserts it.
 *
 * Every offer is a real covenant funded with the type 0x03 packet embedded, so
 * these are indistinguishable from orders any wallet posts. The reader under
 * development finds them the same way it will find anyone else's: off the
 * global `/v1/txs` stream.
 *
 * Rungs are written to scripts/.seeded-book.json (offerHex + funding txid — the
 * only two facts a cancel needs) so a run can be unwound without a repository.
 *
 * Env:
 *   ARK_URL       arkd            (default http://localhost:7070)
 *   ESPLORA_URL   esplora REST    (default http://localhost:3000/api)
 *   SEED_KEY      hex privkey, to re-run as the same maker (default: random)
 *   ASSET_ID      skip issuance and use an existing asset
 *   RUNGS         rungs per side  (default 3)
 *   RUNG_TOKENS   whole tokens per rung (default 100)
 *   MID_SATS      mid price, sats per whole token (default 50)
 *   SPREAD_BPS    half-spread of the innermost rung (default 100 = 1%)
 *   STEP_BPS      added per rung outward (default 100)
 */
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'

const ARK_URL = process.env.ARK_URL ?? 'http://localhost:7070'
const ESPLORA_URL = process.env.ESPLORA_URL ?? 'http://localhost:3000/api'
const RUNGS = Number(process.env.RUNGS ?? 3)
const RUNG_TOKENS = BigInt(process.env.RUNG_TOKENS ?? 100)
const MID_SATS = BigInt(process.env.MID_SATS ?? 50)
const SPREAD_BPS = BigInt(process.env.SPREAD_BPS ?? 100)
const STEP_BPS = BigInt(process.env.STEP_BPS ?? 100)
const DECIMALS = 6

const dryRun = process.argv.includes('--dry-run')
const here = dirname(fileURLToPath(import.meta.url))
const outFile = join(here, '.seeded-book.json')
const arkdExec = 'docker exec -t arkd'

// ── the book, as numbers ─────────────────────────────────────────────────────
// Pure and network-free, so --dry-run exercises every branch of the money math.

/**
 * Sats one rung costs at `edgeBps` away from mid. Both directions round AGAINST
 * the maker — asks up, bids down — so a rounded rung is never quoted better
 * than the price it was meant to be. The covenant honours whatever integer
 * lands here, so rounding the wrong way is a real (if small) giveaway.
 */
const rungSats = (edgeBps, side) => {
  const num = RUNG_TOKENS * MID_SATS * (side === 'ask' ? 10000n + edgeBps : 10000n - edgeBps)
  return side === 'ask' ? (num + 9999n) / 10000n : num / 10000n
}

const planBook = () => {
  const rungAtomic = RUNG_TOKENS * 10n ** BigInt(DECIMALS)
  const rungs = []
  for (let i = 0; i < RUNGS; i++) {
    const edgeBps = SPREAD_BPS + BigInt(i) * STEP_BPS
    for (const side of ['ask', 'bid']) {
      rungs.push({ side, rung: i, edgeBps, assetAtomic: rungAtomic, sats: rungSats(edgeBps, side) })
    }
  }
  return { rungAtomic, rungs }
}

/** Asks cheapest-first, bids highest-first — the two halves of a book. */
const sortBook = (rungs) => ({
  asks: rungs.filter((r) => r.side === 'ask').sort((a, b) => Number(a.sats - b.sats)),
  bids: rungs.filter((r) => r.side === 'bid').sort((a, b) => Number(b.sats - a.sats)),
})

const perToken = (sats) => Number(sats) / Number(RUNG_TOKENS)

const printBook = (rungs, label) => {
  const { asks, bids } = sortBook(rungs)
  console.log(`\n  ${label}                sats per SEED`)
  for (const a of [...asks].reverse()) console.log(`    ask   ${RUNG_TOKENS} SEED`.padEnd(26) + perToken(a.sats))
  console.log(`    ————— spread ${(perToken(asks[0].sats) - perToken(bids[0].sats)).toFixed(2)} —————`)
  for (const b of bids) console.log(`    bid   ${RUNG_TOKENS} SEED`.padEnd(26) + perToken(b.sats))
}

/**
 * The one property this script exists to hold: the seeded position is flat in
 * the asset, and the sats it would take in exceed the sats it would pay out by
 * exactly the spread. A seeder that fails this is a directional bet wearing a
 * book's clothes.
 */
const assertNetsOut = ({ rungs }) => {
  const { asks, bids } = sortBook(rungs)
  const sum = (rs, f) => rs.reduce((acc, r) => acc + f(r), 0n)

  assert.equal(asks.length, bids.length, 'a book needs the same number of rungs per side')
  assert.equal(
    sum(asks, (r) => r.assetAtomic),
    sum(bids, (r) => r.assetAtomic),
    'asset offered must equal asset bid for — otherwise the seeded position is directional',
  )
  assert.ok(
    sum(asks, (r) => r.sats) > sum(bids, (r) => r.sats),
    'the ask side must take in more sats than the bid side pays out',
  )
  assert.ok(asks[0].sats > bids[0].sats, 'best ask must sit above best bid — a crossed book self-fills')
  for (const r of rungs) assert.ok(r.sats > 330n, `rung ${r.side}#${r.rung} is at or below dust`)
  return {
    assetNet: sum(asks, (r) => r.assetAtomic) - sum(bids, (r) => r.assetAtomic),
    satsEdge: sum(asks, (r) => r.sats) - sum(bids, (r) => r.sats),
  }
}

// ── funding ──────────────────────────────────────────────────────────────────

const sh = (cmd) => {
  const out = execSync(cmd, { encoding: 'utf8' })
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => !l.includes('WARN'))
    .join('\n')
    .trim()
  if (out.startsWith('error:')) throw new Error(out)
  return out
}

const waitFor = async (fn, { timeout = 60_000, interval = 500 } = {}) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await fn()) return
    await new Promise((r) => setTimeout(r, interval))
  }
  throw new Error('timed out waiting for the stack')
}

const main = async () => {
  const plan = planBook()
  const net = assertNetsOut(plan)

  if (dryRun) {
    printBook(plan.rungs, 'SEED/BTC (planned)')
    console.log(`\nnets out: asset net ${net.assetNet}, sats edge if fully filled +${net.satsEdge}`)
    return
  }

  // imported here so --dry-run needs no SDK resolution and no network
  const { hex } = await import('@scure/base')
  const {
    asset,
    EsploraProvider,
    InMemoryContractRepository,
    InMemoryWalletRepository,
    RestIndexerProvider,
    SingleKey,
    Wallet,
  } = await import('@arkade-os/sdk')
  const { createOffer } = await import('@arkade-os/swap')

  const identity = process.env.SEED_KEY ? SingleKey.fromHex(process.env.SEED_KEY) : SingleKey.fromRandomBytes()
  const wallet = await Wallet.create({
    identity,
    arkServerUrl: ARK_URL,
    onchainProvider: new EsploraProvider(ESPLORA_URL, { forcePolling: true, pollingInterval: 2000 }),
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
    },
    settlementConfig: false,
  })
  const indexer = new RestIndexerProvider(ARK_URL)
  const address = await wallet.getAddress()

  console.log(`maker   ${address}`)
  console.log(`key     ${identity.toHex()}  (SEED_KEY to re-run as this maker)`)

  // Cover every bid rung, the dust carriers the ask rungs ride on, and issuance.
  const bidTotal = plan.rungs.filter((r) => r.side === 'bid').reduce((a, r) => a + r.sats, 0n)
  const faucet = Number(bidTotal) * 2 + 50_000

  if ((await wallet.getVtxos()).length === 0) {
    console.log(`\nfunding ${faucet} sats from the arkd faucet...`)
    const note = sh(`${arkdExec} arkd note --amount ${faucet + 100_000}`)
    sh(`${arkdExec} ark redeem-notes -n ${note} --password secret`)
    sh(`${arkdExec} ark send --to ${address} --amount ${faucet} --password secret`)
    await waitFor(async () => (await wallet.getVtxos()).length > 0)
  }

  let assetId = process.env.ASSET_ID
  if (!assetId) {
    // Mint both sides' inventory at once. Supply is deliberately larger than the
    // book so the asset balance moving is visible against a stable total.
    const supply = plan.rungAtomic * BigInt(RUNGS) * 10n
    const issued = await wallet.assetManager.issue({
      amount: supply,
      metadata: { name: 'Seed Book Token', ticker: 'SEED', decimals: DECIMALS },
    })
    assetId = issued.assetId
    console.log(`issued  ${assetId}  (${supply} atomic, ${DECIMALS}dp)\n`)
    await waitFor(async () => (await wallet.getBalance()).assets?.some((a) => a.assetId === assetId))
  }

  const assetIdObj = asset.AssetId.fromString(assetId)
  const seeded = []

  for (const r of plan.rungs) {
    // The covenant is keyed on the RECEIVE side: wanting sats is the want-btc
    // program with the deposit named by `offerAsset`; wanting the asset is the
    // want-asset program. Getting this backwards binds an asset amount as a sat
    // want, which a taker could fill for dust.
    const params =
      r.side === 'ask'
        ? { wantAmount: r.sats, offerAsset: assetIdObj }
        : { wantAmount: r.assetAtomic, wantAsset: assetIdObj }
    const offer = await createOffer(wallet, ARK_URL, params)

    const fundingTxid = await wallet.send({
      address: offer.address,
      // asset deposits ride the SDK's default dust sat carrier when amount is omitted
      amount: r.side === 'ask' ? undefined : Number(r.sats),
      assets: r.side === 'ask' ? [{ assetId, amount: r.assetAtomic }] : undefined,
      extensions: [offer.extension],
    })

    seeded.push({
      side: r.side,
      rung: r.rung,
      priceSatsPerToken: perToken(r.sats),
      giveAsset: r.side === 'ask' ? assetId : 'btc',
      giveAmount: (r.side === 'ask' ? r.assetAtomic : r.sats).toString(),
      wantAsset: r.side === 'ask' ? 'btc' : assetId,
      wantAmount: (r.side === 'ask' ? r.sats : r.assetAtomic).toString(),
      address: offer.address,
      swapPkScript: hex.encode(offer.swapPkScript),
      offerHex: offer.offerHex,
      fundingTxid,
    })
    console.log(
      r.side === 'ask'
        ? `ask  #${r.rung}  ${r.assetAtomic} SEED -> ${r.sats} sats   ${fundingTxid}`
        : `bid  #${r.rung}  ${r.sats} sats -> ${r.assetAtomic} SEED   ${fundingTxid}`,
    )
  }

  // A funded covenant the indexer has not caught up to is not an order anyone
  // can find. Match on the funding txid, not the count: identical offers share
  // an address, so a stale deposit at the same script would otherwise pass.
  const scripts = seeded.map((s) => s.swapPkScript)
  await waitFor(async () => {
    const { vtxos } = await indexer.getVtxos({ scripts, spendableOnly: true })
    const live = new Set(vtxos.map((v) => v.txid))
    return seeded.every((s) => live.has(s.fundingTxid))
  })

  writeFileSync(outFile, JSON.stringify({ assetId, maker: address, rungs: seeded }, null, 2))

  printBook(plan.rungs, `${assetId.slice(0, 12)}…/BTC`)
  console.log(`\nnets out: asset net ${net.assetNet}, sats edge if fully filled +${net.satsEdge}`)
  console.log(`${seeded.length} rungs resting. written to ${outFile}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
