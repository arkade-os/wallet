/**
 * Full-stack banco swap integration tests.
 *
 * These tests exercise the complete swap flow using the SDK directly:
 * create offer → fund → verify status → (taker auto-fulfills) → verify.
 *
 * Requirements: arkd (7070), introspector (7073).
 * For taker-fulfilled tests: fulmine with taker (7000/7001).
 *
 * Note: These are NOT UI tests. The wallet UI form is tested separately in
 * banco.test.ts. These test the underlying banco mechanics end-to-end.
 */
import { test, expect } from '@playwright/test'
import { Maker, Offer } from '@arkade-os/banco'
import { asset, Wallet } from '@arkade-os/sdk'
import {
  createFundedWallet,
  issueAsset,
  fundFulmineWithAsset,
  fundFulmineWithBtc,
  addBancoPair,
  removeBancoPair,
  swapPkScriptToAddress,
} from './bancoHelpers'

const ARK_URL = 'http://localhost:7070'
const INTROSPECTOR_URL = 'http://localhost:7073'
const PRICE_FEED = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'

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
    const maker = new Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

    // Create offer
    const { offer, packet, swapPkScript } = await maker.createOffer({
      wantAmount: BigInt(500),
      cancelDelay: 300,
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
    const maker = new Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

    // Create offer: deposit asset, want BTC
    const { offer, packet, swapPkScript } = await maker.createOffer({
      wantAmount: BigInt(5000),
      offerAsset: asset.AssetId.fromString(assetId),
      cancelDelay: 300,
    })

    expect(offer).toBeTruthy()

    // Fund the swap with asset
    const swapAddress = await swapPkScriptToAddress(swapPkScript)
    await makerWallet.send({
      address: swapAddress,
      amount: 450,
      assets: [{ assetId, amount: 500 }],
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
    const maker = new Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

    // Create offer: deposit BTC, want specific asset
    const wantAssetId = asset.AssetId.fromString(assetId)
    const { offer, packet, swapPkScript } = await maker.createOffer({
      wantAmount: BigInt(50),
      wantAsset: wantAssetId,
      cancelDelay: 300,
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

    const maker = new Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

    // Create offer: deposit assetA, want assetB
    const { offer, packet, swapPkScript } = await maker.createOffer({
      wantAmount: BigInt(50),
      wantAsset: asset.AssetId.fromString(assetB),
      offerAsset: asset.AssetId.fromString(assetA),
      cancelDelay: 300,
    })

    expect(offer).toBeTruthy()

    // Fund with assetA
    const swapAddress = await swapPkScriptToAddress(swapPkScript)
    await makerWallet.send({
      address: swapAddress,
      amount: 450,
      assets: [{ assetId: assetA, amount: 500 }],
      extensions: [{ type: packet.type(), payload: packet.serialize() }],
    })

    const offers = await maker.getOffers(swapPkScript)
    expect(offers.length).toBe(1)
    expect(offers[0].spendable).toBe(true)
  })

  test('Offer hex roundtrips correctly', async () => {
    const makerWallet = await createFundedWallet(100_000)
    const maker = new Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

    const { offer } = await maker.createOffer({
      wantAmount: BigInt(1000),
      cancelDelay: 300,
    })

    // Verify offer hex can be decoded and re-encoded
    const decoded = Offer.fromHex(offer)
    expect(decoded.wantAmount).toBe(BigInt(1000))
    expect(decoded.makerPkScript.length).toBe(34)
    expect(decoded.introspectorPubkey.length).toBe(32)
    expect(decoded.cancelDelay).toBeDefined()

    const reEncoded = Offer.toHex(decoded)
    expect(reEncoded).toBe(offer)
  })
})

// ── Taker-fulfilled swap tests ──
// These require a fulmine instance with FULMINE_TAKER_ENABLED=true
// and FULMINE_INTROSPECTOR_URL configured.

test.describe('Banco taker-fulfilled swaps', () => {
  // SDK-only tests: run on a single project to avoid depleting the taker's funds
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'Google Chrome', 'SDK tests run on one project only')
  })
  test.setTimeout(120_000)

  test('BTC → Asset swap (taker fulfills)', async () => {
    // 1. Fund fulmine taker with an asset
    const assetId = await fundFulmineWithAsset(1000)
    const pairName = `BTC/${assetId}`

    // 2. Configure the pair on fulmine
    await addBancoPair(pairName, assetId, PRICE_FEED)

    try {
      // 3. Create a maker wallet with BTC
      const makerWallet = await createFundedWallet(100_000)
      const maker = new Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

      // 4. Create offer: deposit BTC, want 500 of asset
      const wantAssetId = asset.AssetId.fromString(assetId)
      const { offer, packet, swapPkScript } = await maker.createOffer({
        wantAmount: BigInt(500),
        wantAsset: wantAssetId,
        cancelDelay: 300,
      })

      expect(offer).toBeTruthy()

      // 5. Snapshot VTXO count before funding
      const vtxosBefore = await makerWallet.getVtxos()

      // 6. Convert swapPkScript to address and fund
      const swapAddress = await swapPkScriptToAddress(swapPkScript)
      await makerWallet.send({
        address: swapAddress,
        amount: 10000,
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
        return sum + (assetMatch?.amount ?? 0)
      }, 0)
      expect(totalReceived).toBeGreaterThanOrEqual(500)
    } finally {
      await removeBancoPair(pairName)
    }
  })

  test('Asset → BTC swap (taker fulfills)', async () => {
    // 1. Fund fulmine taker with BTC
    await fundFulmineWithBtc(50_000)

    // 2. Create a maker wallet, fund and issue an asset
    const makerWallet = await createFundedWallet(100_000)
    const assetId = await issueAsset(makerWallet, 500)
    const pairName = `${assetId}/BTC`

    // 3. Configure the pair
    await addBancoPair(pairName, '', PRICE_FEED)

    try {
      const maker = new Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

      // 4. Create offer: deposit asset, want BTC
      const { packet, swapPkScript } = await maker.createOffer({
        wantAmount: BigInt(5000),
        offerAsset: asset.AssetId.fromString(assetId),
        cancelDelay: 300,
      })

      // 5. Snapshot VTXO count before funding
      const vtxosBefore = await makerWallet.getVtxos()

      // 6. Encode swap address and fund
      const swapAddress = await swapPkScriptToAddress(swapPkScript)
      await makerWallet.send({
        address: swapAddress,
        amount: 450,
        assets: [{ assetId, amount: 500 }],
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

    // 2. Fund fulmine taker with assetB
    const assetB = await fundFulmineWithAsset(1000)
    const pairName = `${assetA}/${assetB}`

    // 3. Configure the pair
    await addBancoPair(pairName, assetB, PRICE_FEED)

    try {
      const maker = new Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

      // 4. Create offer: deposit assetA, want 500 of assetB
      const { packet, swapPkScript } = await maker.createOffer({
        wantAmount: BigInt(500),
        wantAsset: asset.AssetId.fromString(assetB),
        offerAsset: asset.AssetId.fromString(assetA),
        cancelDelay: 300,
      })

      // 5. Snapshot VTXO count before funding
      const vtxosBefore = await makerWallet.getVtxos()

      // 6. Fund the swap
      const swapAddress = await swapPkScriptToAddress(swapPkScript)
      await makerWallet.send({
        address: swapAddress,
        amount: 450,
        assets: [{ assetId: assetA, amount: 500 }],
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
        return sum + (match?.amount ?? 0)
      }, 0)
      expect(totalAssetB).toBeGreaterThanOrEqual(500)
    } finally {
      await removeBancoPair(pairName)
    }
  })
})
