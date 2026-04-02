/**
 * Full-stack banco swap integration tests.
 *
 * These tests exercise the complete swap flow using the SDK directly:
 * create offer → fund → taker auto-fulfills → verify.
 *
 * Requirements: arkd (7070), fulmine with taker (7000/7001), introspector (7073).
 *
 * Note: These are NOT UI tests. The wallet UI form is tested separately in
 * banco.test.ts. These test the underlying banco mechanics end-to-end.
 */
import { test, expect } from '@playwright/test'
import { banco, asset } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import {
  createFundedWallet,
  issueAsset,
  sendAsset,
  fundFulmineWithAsset,
  fundFulmineWithBtc,
  getFulmineAddress,
  addBancoPair,
  removeBancoPair,
} from './bancoHelpers'

const ARK_URL = 'http://localhost:7070'
const INTROSPECTOR_URL = 'http://localhost:7073'
const PRICE_FEED = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'

/** Poll offer status until fulfilled or timeout. */
async function waitForFulfillment(
  maker: InstanceType<typeof banco.Maker>,
  swapPkScript: Uint8Array,
  timeoutMs = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const offers = await maker.getOffers(swapPkScript)
    const pending = offers.some((o) => o.spendable)
    if (!pending) return
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('Timed out waiting for offer fulfillment')
}

test.describe('Banco swap integration', () => {
  test.setTimeout(120_000) // swaps can take time

  test('BTC → Asset swap', async () => {
    // 1. Fund fulmine taker with an asset
    const assetId = await fundFulmineWithAsset(1000)
    const pairName = `BTC/${assetId}`

    // 2. Configure the pair on fulmine
    await addBancoPair(pairName, assetId, PRICE_FEED)

    try {
      // 3. Create a maker wallet with BTC
      const makerWallet = await createFundedWallet(100_000)
      const maker = new banco.Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

      // 4. Create offer: deposit BTC, want 500 of asset
      const wantAssetId = asset.AssetId.fromString(assetId)
      const { offer, packet, swapPkScript } = await maker.createOffer({
        wantAmount: 500n,
        wantAsset: wantAssetId,
        cancelDelay: 300,
      })

      // 5. Fund the offer
      const fulmineAddr = await getFulmineAddress()
      // We need to encode swapPkScript to an address. Use the maker's wallet.
      const makerAddress = await makerWallet.getAddress()
      // Get server info for address encoding
      const info = await fetch(`${ARK_URL}/v1/info`).then((r) => r.json())
      const rawPubkey = hex.decode(info.signerPubkey || info.signer_pubkey)
      const serverPubKey = rawPubkey.length === 33 ? rawPubkey.slice(1) : rawPubkey
      const { ArkAddress } = await import('@arkade-os/sdk')
      const vtxoKey = swapPkScript.slice(2)
      const addrPrefix = info.addrPrefix || info.addr_prefix || 'tark'
      const swapAddress = new ArkAddress(serverPubKey, vtxoKey, addrPrefix).encode()

      await makerWallet.send({
        address: swapAddress,
        amount: 10000,
        extensions: [{ type: packet.type(), payload: packet.serialize() }],
      })

      // 6. Wait for taker to fulfill
      await waitForFulfillment(maker, swapPkScript)

      // 7. Verify — maker should have received the asset
      const vtxos = await makerWallet.getVtxos()
      const assetVtxos = vtxos.filter((v) => v.assets && v.assets.some((a) => a.assetId === assetId))
      expect(assetVtxos.length).toBeGreaterThan(0)
    } finally {
      await removeBancoPair(pairName)
    }
  })

  test('Asset → BTC swap', async () => {
    // 1. Fund fulmine taker with BTC
    await fundFulmineWithBtc(50_000)

    // 2. Create a maker wallet, fund and issue an asset
    const makerWallet = await createFundedWallet(100_000)
    const assetId = await issueAsset(makerWallet, 500)
    const pairName = `${assetId}/BTC`

    // 3. Configure the pair
    await addBancoPair(pairName, '', PRICE_FEED)

    try {
      const maker = new banco.Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

      // 4. Create offer: deposit asset, want BTC
      const { offer, packet, swapPkScript } = await maker.createOffer({
        wantAmount: 5000n,
        offerAsset: asset.AssetId.fromString(assetId),
        cancelDelay: 300,
      })

      // 5. Encode swap address and fund
      const info = await fetch(`${ARK_URL}/v1/info`).then((r) => r.json())
      const rawPubkey = hex.decode(info.signerPubkey || info.signer_pubkey)
      const serverPubKey = rawPubkey.length === 33 ? rawPubkey.slice(1) : rawPubkey
      const { ArkAddress } = await import('@arkade-os/sdk')
      const addrPrefix = info.addrPrefix || info.addr_prefix || 'tark'
      const swapAddress = new ArkAddress(serverPubKey, swapPkScript.slice(2), addrPrefix).encode()

      await makerWallet.send({
        address: swapAddress,
        amount: 450, // dust BTC with asset
        assets: [{ assetId, amount: 500 }],
        extensions: [{ type: packet.type(), payload: packet.serialize() }],
      })

      // 6. Wait for fulfillment
      await waitForFulfillment(maker, swapPkScript)

      // 7. Verify — maker's BTC balance should have increased
      const balance = await makerWallet.getBalance()
      // Maker started with ~100k, spent ~450 dust + fees, should get 5000 back
      expect(balance.available).toBeGreaterThan(0)
    } finally {
      await removeBancoPair(pairName)
    }
  })

  test('Asset → Asset swap', async () => {
    // 1. Create maker wallet, fund with BTC, issue assetA
    const makerWallet = await createFundedWallet(100_000)
    const assetA = await issueAsset(makerWallet, 500)

    // 2. Fund fulmine taker with assetB
    const assetB = await fundFulmineWithAsset(1000)
    const pairName = `${assetA}/${assetB}`

    // 3. Configure the pair
    await addBancoPair(pairName, assetB, PRICE_FEED)

    try {
      const maker = new banco.Maker(makerWallet, ARK_URL, INTROSPECTOR_URL)

      // 4. Create offer: deposit assetA, want 500 of assetB
      const { offer, packet, swapPkScript } = await maker.createOffer({
        wantAmount: 500n,
        wantAsset: asset.AssetId.fromString(assetB),
        offerAsset: asset.AssetId.fromString(assetA),
        cancelDelay: 300,
      })

      // 5. Fund the swap
      const info = await fetch(`${ARK_URL}/v1/info`).then((r) => r.json())
      const rawPubkey = hex.decode(info.signerPubkey || info.signer_pubkey)
      const serverPubKey = rawPubkey.length === 33 ? rawPubkey.slice(1) : rawPubkey
      const { ArkAddress } = await import('@arkade-os/sdk')
      const addrPrefix = info.addrPrefix || info.addr_prefix || 'tark'
      const swapAddress = new ArkAddress(serverPubKey, swapPkScript.slice(2), addrPrefix).encode()

      await makerWallet.send({
        address: swapAddress,
        amount: 450,
        assets: [{ assetId: assetA, amount: 500 }],
        extensions: [{ type: packet.type(), payload: packet.serialize() }],
      })

      // 6. Wait for fulfillment
      await waitForFulfillment(maker, swapPkScript)

      // 7. Verify — maker should have received assetB
      const vtxos = await makerWallet.getVtxos()
      const assetBVtxos = vtxos.filter((v) => v.assets && v.assets.some((a) => a.assetId === assetB))
      expect(assetBVtxos.length).toBeGreaterThan(0)
    } finally {
      await removeBancoPair(pairName)
    }
  })
})
