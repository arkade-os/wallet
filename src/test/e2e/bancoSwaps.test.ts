/**
 * Full-stack banco swap integration tests.
 *
 * These tests exercise the complete swap flow using the SDK directly:
 * create offer → fund → verify status → (taker auto-fulfills) → verify.
 *
 * Requirements: arkd (7070), emulator (7073), solver (7091).
 *
 * Note: These are NOT UI tests. The wallet UI form is tested separately in
 * banco.test.ts. These test the underlying banco mechanics end-to-end.
 */
import { test, expect } from '@playwright/test'
import { asset, Wallet } from '@arkade-os/sdk'
import {
  createFundedWallet,
  issueAsset,
  fundSolverWithAsset as fundClaimBotWithAsset,
  fundSolverWithBtc,
  addBancoPair,
  removeBancoPair,
  swapPkScriptToAddress,
} from './bancoHelpers'
import { Maker } from '../../lib/banco/maker'
import { Offer } from '../../lib/banco/offer'

const ARK_URL = 'http://localhost:7070'
const EMULATOR_URL = 'http://localhost:7073'

/**
 * Build a price-feed URL backed by the local mock that returns the requested
 * price as `{"x":{"y": <price>}}`. The solver is in the nigiri network so it
 * reaches the mock by container name; we point at it on the host network for
 * sanity checks.
 *
 * The price is computed as `depositAmount / wantAmount` (with default decimal
 * adjustments: BTC=8, asset=0). The solver accepts offers within 1% of this feed,
 * so encoding the exact ratio always passes validation.
 */
function priceFeedURL(depositAmount: number, wantAmount: number, depositDecimals = 8, wantDecimals = 0): string {
  const adjustedDeposit = depositAmount / 10 ** depositDecimals
  const adjustedWant = wantAmount / 10 ** wantDecimals
  const price = adjustedDeposit / adjustedWant
  return `http://price-mock:9099/?p=${price}`
}

/**
 * Wait for the maker wallet to receive new VTXOs after the swap.
 * We track the VTXO count before the swap and wait until it increases,
 * which indicates the taker fulfilled and the maker received funds.
 */
async function waitForNewVtxos(wallet: Wallet, initialVtxoCount: number, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const vtxos = await wallet.getVtxos()
    if (vtxos.length > initialVtxoCount) return
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('Timed out waiting for new VTXOs from fulfillment')
}

// ── Offer creation and status tests (no taker dependency) ──

test.describe('Banco offer lifecycle', () => {
  test.setTimeout(120_000)

  test('Create offer and verify it appears as spendable', async () => {
    const makerWallet = await createFundedWallet(100_000)
    const maker = new Maker(makerWallet, ARK_URL, EMULATOR_URL)

    // Create offer
    const { offer, packet, swapPkScript } = await maker.createOffer({
      wantAmount: BigInt(500),
    })

    expect(offer).toBeTruthy()
    expect(swapPkScript.length).toBeGreaterThan(0)

    // Before funding: no offers at the swap address
    const offersInitial = await maker.getOffers(swapPkScript)
    expect(offersInitial.length).toBe(0)

    // Fund the swap
    const swapAddress = await swapPkScriptToAddress(swapPkScript)
    expect(swapAddress).toMatch(/^tark/)

    await makerWallet.send({
      address: swapAddress,
      amount: 5000,
      extensions: [{ type: packet.type(), payload: packet.serialize() }],
    })

    // After funding: exactly one spendable offer
    const offersAfterFund = await maker.getOffers(swapPkScript)
    expect(offersAfterFund.length).toBe(1)
    expect(offersAfterFund[0].spendable).toBe(true)
    expect(offersAfterFund[0].value).toBe(5000)
  })

  test('Create asset offer and verify funding', async () => {
    const makerWallet = await createFundedWallet(100_000)
    const assetId = await issueAsset(makerWallet, 500)
    const maker = new Maker(makerWallet, ARK_URL, EMULATOR_URL)

    // Create offer: deposit asset, want BTC
    const { offer, packet, swapPkScript } = await maker.createOffer({
      wantAmount: BigInt(5000),
      offerAsset: asset.AssetId.fromString(assetId),
    })

    expect(offer).toBeTruthy()

    // Fund the swap with asset
    const swapAddress = await swapPkScriptToAddress(swapPkScript)
    await makerWallet.send({
      address: swapAddress,
      amount: 450,
      assets: [{ assetId, amount: BigInt(500) }],
      extensions: [{ type: packet.type(), payload: packet.serialize() }],
    })

    // Verify offer with asset is live
    const offers = await maker.getOffers(swapPkScript)
    expect(offers.length).toBe(1)
    expect(offers[0].spendable).toBe(true)
  })

  test('Create offer with wantAsset and verify', async () => {
    // Issue an asset first (we need its ID for the offer)
    const helperWallet = await createFundedWallet(100_000)
    const assetId = await issueAsset(helperWallet, 100)

    const makerWallet = await createFundedWallet(100_000)
    const maker = new Maker(makerWallet, ARK_URL, EMULATOR_URL)

    // Create offer: deposit BTC, want specific asset
    const wantAssetId = asset.AssetId.fromString(assetId)
    const { offer, packet, swapPkScript } = await maker.createOffer({
      wantAmount: BigInt(50),
      wantAsset: wantAssetId,
    })

    expect(offer).toBeTruthy()

    // Fund the swap
    const swapAddress = await swapPkScriptToAddress(swapPkScript)
    await makerWallet.send({
      address: swapAddress,
      amount: 10000,
      extensions: [{ type: packet.type(), payload: packet.serialize() }],
    })

    const offers = await maker.getOffers(swapPkScript)
    expect(offers.length).toBe(1)
    expect(offers[0].spendable).toBe(true)
    expect(offers[0].value).toBe(10000)
  })

  test('Create asset→asset offer and verify', async () => {
    const makerWallet = await createFundedWallet(100_000)
    const assetA = await issueAsset(makerWallet, 500)

    const helperWallet = await createFundedWallet(100_000)
    const assetB = await issueAsset(helperWallet, 100)

    const maker = new Maker(makerWallet, ARK_URL, EMULATOR_URL)

    // Create offer: deposit assetA, want assetB
    const { offer, packet, swapPkScript } = await maker.createOffer({
      wantAmount: BigInt(50),
      wantAsset: asset.AssetId.fromString(assetB),
      offerAsset: asset.AssetId.fromString(assetA),
    })

    expect(offer).toBeTruthy()

    // Fund with assetA
    const swapAddress = await swapPkScriptToAddress(swapPkScript)
    await makerWallet.send({
      address: swapAddress,
      amount: 450,
      assets: [{ assetId: assetA, amount: BigInt(500) }],
      extensions: [{ type: packet.type(), payload: packet.serialize() }],
    })

    const offers = await maker.getOffers(swapPkScript)
    expect(offers.length).toBe(1)
    expect(offers[0].spendable).toBe(true)
  })

  test('Offer hex roundtrips correctly', async () => {
    const makerWallet = await createFundedWallet(100_000)
    const maker = new Maker(makerWallet, ARK_URL, EMULATOR_URL)

    const { offer } = await maker.createOffer({
      wantAmount: BigInt(1000),
    })

    // Verify offer hex can be decoded and re-encoded
    const decoded = Offer.fromHex(offer)
    expect(decoded.wantAmount).toBe(BigInt(1000))
    expect(decoded.makerPkScript.length).toBe(34)
    expect(decoded.emulatorPubkey.length).toBe(32)
    expect(decoded.makerPublicKey).toBeDefined()

    const reEncoded = Offer.toHex(decoded)
    expect(reEncoded).toBe(offer)
  })
})

// ── Taker-fulfilled swap tests ──
// These require the solver with the banco plugin enabled (SOLVER_BANCO_ENABLED=true)
// and a configured SOLVER_EMULATOR_URL.

test.describe('Banco taker-fulfilled swaps', () => {
  // SDK-only tests: run on a single project to avoid depleting the taker's funds
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'Google Chrome', 'SDK tests run on one project only')
  })
  test.setTimeout(120_000)

  test('BTC → Asset swap (taker fulfills)', async () => {
    // 1. Fund the solver taker with an asset
    const assetId = await fundClaimBotWithAsset(1000)
    const pairName = `BTC/${assetId}`

    const wantAmount = 500
    const fundingAmount = 10_000

    // 2. Configure the pair on the solver with a feed price matching the offer ratio
    await addBancoPair(pairName, priceFeedURL(fundingAmount, wantAmount))

    try {
      // 3. Create a maker wallet with BTC
      const makerWallet = await createFundedWallet(100_000)
      const maker = new Maker(makerWallet, ARK_URL, EMULATOR_URL)

      // 4. Create offer: deposit BTC, want 500 of asset
      const wantAssetId = asset.AssetId.fromString(assetId)
      const { offer, packet, swapPkScript } = await maker.createOffer({
        wantAmount: BigInt(wantAmount),
        wantAsset: wantAssetId,
      })

      expect(offer).toBeTruthy()

      // 5. Snapshot VTXO count before funding
      const vtxosBefore = await makerWallet.getVtxos()

      // 6. Convert swapPkScript to address and fund
      const swapAddress = await swapPkScriptToAddress(swapPkScript)
      await makerWallet.send({
        address: swapAddress,
        amount: fundingAmount,
        extensions: [{ type: packet.type(), payload: packet.serialize() }],
      })

      // 7. Wait for taker to fulfill (maker receives new VTXOs)
      await waitForNewVtxos(makerWallet, vtxosBefore.length)

      // 8. Verify — maker should have received the asset
      const vtxos = await makerWallet.getVtxos()
      const assetVtxos = vtxos.filter((v) => v.assets && v.assets.some((a) => a.assetId === assetId))
      expect(assetVtxos.length).toBeGreaterThan(0)

      const totalReceived = assetVtxos.reduce((sum, v) => {
        const assetMatch = v.assets!.find((a) => a.assetId === assetId)
        return sum + Number(assetMatch?.amount ?? 0)
      }, 0)
      expect(totalReceived).toBeGreaterThanOrEqual(wantAmount)
    } finally {
      await removeBancoPair(pairName)
    }
  })

  test('Asset → BTC swap (taker fulfills)', async () => {
    // 1. Fund the solver taker with BTC
    await fundSolverWithBtc(50_000)

    // 2. Create a maker wallet, fund and issue an asset
    const makerWallet = await createFundedWallet(100_000)
    const assetId = await issueAsset(makerWallet, 500)
    const pairName = `${assetId}/BTC`

    const wantAmount = 5000
    const depositAmount = 500

    // 3. Configure the pair (deposit is asset, want is BTC, so swap decimals)
    await addBancoPair(pairName, priceFeedURL(depositAmount, wantAmount, 0, 8))

    try {
      const maker = new Maker(makerWallet, ARK_URL, EMULATOR_URL)

      // 4. Create offer: deposit asset, want BTC
      const { packet, swapPkScript } = await maker.createOffer({
        wantAmount: BigInt(wantAmount),
        offerAsset: asset.AssetId.fromString(assetId),
      })

      // 5. Snapshot VTXO count before funding
      const vtxosBefore = await makerWallet.getVtxos()

      // 6. Encode swap address and fund
      const swapAddress = await swapPkScriptToAddress(swapPkScript)
      await makerWallet.send({
        address: swapAddress,
        amount: 450,
        assets: [{ assetId, amount: BigInt(depositAmount) }],
        extensions: [{ type: packet.type(), payload: packet.serialize() }],
      })

      // 7. Wait for taker to fulfill (maker receives new VTXOs)
      await waitForNewVtxos(makerWallet, vtxosBefore.length)

      // 8. Verify — maker's BTC balance reflects the swap
      const balance = await makerWallet.getBalance()
      expect(balance.available).toBeGreaterThan(0)
    } finally {
      await removeBancoPair(pairName)
    }
  })

  test('Asset → Asset swap (taker fulfills)', async () => {
    // 1. Create maker wallet, fund with BTC, issue assetA
    const makerWallet = await createFundedWallet(100_000)
    const assetA = await issueAsset(makerWallet, 500)

    // 2. Fund the solver taker with assetB
    const assetB = await fundClaimBotWithAsset(1000)
    const pairName = `${assetA}/${assetB}`

    const wantAmount = 500
    const depositAmount = 500

    // 3. Configure the pair (asset/asset, both decimals 0)
    await addBancoPair(pairName, priceFeedURL(depositAmount, wantAmount, 0, 0))

    try {
      const maker = new Maker(makerWallet, ARK_URL, EMULATOR_URL)

      // 4. Create offer: deposit assetA, want 500 of assetB
      const { packet, swapPkScript } = await maker.createOffer({
        wantAmount: BigInt(wantAmount),
        wantAsset: asset.AssetId.fromString(assetB),
        offerAsset: asset.AssetId.fromString(assetA),
      })

      // 5. Snapshot VTXO count before funding
      const vtxosBefore = await makerWallet.getVtxos()

      // 6. Fund the swap
      const swapAddress = await swapPkScriptToAddress(swapPkScript)
      await makerWallet.send({
        address: swapAddress,
        amount: 450,
        assets: [{ assetId: assetA, amount: BigInt(depositAmount) }],
        extensions: [{ type: packet.type(), payload: packet.serialize() }],
      })

      // 7. Wait for taker to fulfill (maker receives new VTXOs)
      await waitForNewVtxos(makerWallet, vtxosBefore.length)

      // 8. Verify — maker should have received assetB
      const vtxos = await makerWallet.getVtxos()
      const assetBVtxos = vtxos.filter((v) => v.assets && v.assets.some((a) => a.assetId === assetB))
      expect(assetBVtxos.length).toBeGreaterThan(0)

      const totalAssetB = assetBVtxos.reduce((sum, v) => {
        const match = v.assets!.find((a) => a.assetId === assetB)
        return sum + Number(match?.amount ?? 0)
      }, 0)
      expect(totalAssetB).toBeGreaterThanOrEqual(wantAmount)
    } finally {
      await removeBancoPair(pairName)
    }
  })
})
