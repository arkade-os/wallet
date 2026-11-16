import { expect, test, type TestInfo } from '@playwright/test'
import { ArkAddress, RestIndexerProvider } from '@arkade-os/sdk'
import type { OfferSwapRecord } from '@arkade-os/swap'
import { ASSET_CARRIER_SATS, decodeOffer, offerContract } from '@arkade-os/swap/protocol'
import { hex } from '@scure/base'
import { navigateHome, navigateToSwaps } from '../utils'
import { actor, admin, advances, importAsset, ledger, nativeOffers, shift, tr, type Actor } from './helpers'

async function swap(
  trader: Actor,
  assetId: string,
  parties: Record<string, string>,
  forward: boolean,
  amount: string,
  info: TestInfo,
): Promise<OfferSwapRecord> {
  const { page } = trader
  const label = forward ? 'BTC to ARFQ' : 'ARFQ to BTC'
  const before = await ledger(parties, assetId)
  const previous = await nativeOffers(page)
  const taxiBefore = await advances()
  await navigateHome(page)
  await navigateToSwaps(page)
  await page.getByTestId(forward ? 'swap-asset-row-sats' : 'swap-asset-row-arfq').click()
  await page.locator('.swap-receive-card').click()
  await page.getByTestId(forward ? 'swap-asset-row-arfq' : 'swap-asset-row-sats').click()
  const assetMode = page.getByRole('button', { name: 'Show asset amount first', exact: true })
  if (await assetMode.isVisible()) await assetMode.click()
  for (const digit of amount) await page.getByRole('button', { name: digit, exact: true }).click()
  const proceed = page.getByRole('button', { name: tr.common.continue, exact: true })
  await expect(proceed).toBeEnabled({ timeout: 60_000 })
  await info.attach(`${label} composer`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  await proceed.click()
  const review = page.getByRole('dialog')
  await expect(review.getByText(tr.swap.reviewSwap, { exact: true })).toBeVisible()
  const metric = (name: string) =>
    review
      .locator('.swap-metric-row')
      .filter({ has: page.getByText(name, { exact: true }) })
      .locator('span')
      .last()
  const receivedText = await metric(tr.swap.receive).innerText()
  const receiveMatch = /^([\d,]+) (ARFQ|sats)$/.exec(receivedText)
  if (!receiveMatch) throw new Error(`The review did not show an exact atomic receive amount: ${receivedText}`)
  const minimumReceive = BigInt(receiveMatch[1].replaceAll(',', ''))
  expect(minimumReceive).toBeGreaterThan(0n)
  expect(receiveMatch[2]).toBe(forward ? 'ARFQ' : 'sats')
  await expect(metric(tr.swap.fees)).toHaveText(forward ? '0 ARFQ' : '0 sats')
  await info.attach(`${label} review`, {
    body: await review.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  await review.getByRole('button', { name: tr.swap.confirmSwap, exact: true }).click()
  const success = page.getByRole('button', { name: tr.swap.createdTapHome, exact: true })
  const error = page.locator('.swap-confirm-error')
  await success.or(error).first().waitFor({ state: 'visible', timeout: 60_000 })
  if (await error.isVisible()) throw new Error(await error.innerText())
  await success.click()
  const fresh = async () =>
    (await nativeOffers(page)).filter(
      (record): record is OfferSwapRecord =>
        record.family === 'offer' && !previous.some((known) => known.id === record.id),
    )
  await expect.poll(async () => (await fresh()).length, { timeout: 60_000 }).toBe(1)
  await expect.poll(async () => (await fresh())[0]?.status, { timeout: 90_000 }).toBe('fulfilled')
  const record = (await fresh())[0]
  expect(record.assetPayment).toBeUndefined()
  expect(record.give.amount).toBe(amount)
  expect(BigInt(record.take.amount)).toBeGreaterThanOrEqual(minimumReceive)
  expect(record.fundingTxid).toMatch(/^[0-9a-f]{64}$/)
  expect(record.spentTxid).toMatch(/^[0-9a-f]{64}$/)
  const decoded = decodeOffer(hex.decode(record.offerHex))
  expect(Boolean(decoded.wantAsset)).toBe(forward)
  expect((forward ? decoded.wantAsset : decoded.offerAsset)?.toString()).toBe(assetId)
  const { swapPkScript, ...binding } = decoded
  const compiled = offerContract(binding, ArkAddress.decode(trader.address).serverPubKey)
  expect(hex.encode(compiled.pkScript)).toBe(hex.encode(swapPkScript))
  expect(record.swapPkScript).toBe(hex.encode(compiled.pkScript))
  const given = BigInt(record.give.amount)
  const taken = BigInt(record.take.amount)
  const carrier = forward ? ASSET_CARRIER_SATS : BigInt(record.carrierSats ?? ASSET_CARRIER_SATS)
  const satsChange = forward ? carrier - given : taken - carrier
  const assetChange = forward ? taken : -given
  const expected = {
    trader: shift(before.trader, satsChange, assetChange),
    solver: shift(before.solver, -satsChange, -assetChange),
    taxi: before.taxi,
  }
  await expect.poll(() => ledger(parties, assetId), { timeout: 60_000 }).toEqual(expected)
  expect((await advances()).map(({ id }) => id).sort()).toEqual(taxiBefore.map(({ id }) => id).sort())
  expect(await fresh()).toHaveLength(1)
  await info.attach(`${label} financial evidence`, {
    body: JSON.stringify(
      { program: forward ? 'wantAsset' : 'wantBtc', record, carrier: carrier.toString(), before, after: expected },
      null,
      2,
    ),
    contentType: 'application/json',
  })
  await info.attach(`${label} wallet`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
  return record
}

for (const reverse of [false, true]) {
  test(
    reverse ? 'Swap screen trades received ARFQ back to BTC' : 'Swap screen trades BTC for ARFQ',
    async ({ browser }, info) => {
      const assetId = process.env.TAXI_NATIVE_RFQ_ASSET_ID
      const solver = process.env.TAXI_NATIVE_RFQ_SOLVER_ADDRESS
      if (!assetId || !solver) throw new Error('The native solver asset fixture is required')
      const details = await new RestIndexerProvider(
        process.env.TAXI_REGTEST_ARKD_URL ?? 'http://localhost:7070',
      ).getAssetDetails(assetId)
      expect(details.metadata?.decimals).toBe(0)
      const context = await browser.newContext({
        ...info.project.use,
        ...info.project.use.contextOptions,
        baseURL: info.project.use.baseURL,
      })
      try {
        const trader = await actor(await context.newPage(), 100_000)
        await importAsset(trader, assetId)
        const { arkAddress: taxi } = await admin<{ arkAddress: string }>('funding')
        const parties = { trader: trader.address, solver, taxi }
        await test.step('BTC to ARFQ uses the compiled want-asset program', () =>
          swap(trader, assetId, parties, true, '3000', info))
        if (reverse) {
          await test.step('ARFQ to BTC uses the compiled want-BTC program', () =>
            swap(trader, assetId, parties, false, '1000', info))
        }
      } finally {
        await context.close()
      }
    },
  )
}
