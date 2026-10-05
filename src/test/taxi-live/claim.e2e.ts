import { devices, expect, test, type Page } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { ArkAddress, RestIndexerProvider } from '@arkade-os/sdk'
import { base64, hex } from '@scure/base'
import { Transaction } from '@scure/btc-signer'
import { navigateToSettings } from '../e2e/utils'
import {
  admin,
  advances,
  confirmSend,
  expectLedger,
  fund,
  importAsset,
  ledger,
  mintXyz,
  newAdvance,
  newAdvances,
  operatorAddress,
  policyRulesForPatch,
  prepareSend,
  receiveRequest,
  required,
  shift,
  sheet,
  stage,
  taxiStatus,
  taxiRows,
  tr,
  xyzRule,
  type Actor,
  type TaxiPolicy,
} from './actors'

const TITLE = 'Claim your Taxi delivery'
const MERGE = 'Your 1,000 sats coin merges with the delivery and comes back as 1,000 sats.'

const refocus = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('focus')))
const claimButton = (page: Page) => sheet(page).getByRole('button', { name: 'Claim', exact: true })

async function claimed(bob: Actor, id: string, state = 'recycled'): Promise<void> {
  await claimButton(bob.page).click()
  await expect(bob.page.getByText(TITLE, { exact: true })).not.toBeVisible()
  const success = bob.page.getByRole('button', { name: /Sounds good|Tap to go home/ })
  if (await success.isVisible().catch(() => false)) await success.click()
  await expect.poll(async () => (await taxiStatus(id)).state).toBe(state)
}

test('The claim sheet: what it shows, when, and on which screens', { tag: '@claim' }, async ({ browser }, testInfo) => {
  await stage(browser, testInfo, async ({ join, faucet, evidence }) => {
    const alice = await join('Alice', { sats: 5_000 })
    const bob = await join('Bob')
    const dave = await join('Dave', { device: devices['Pixel 7'] })
    const assetId = await mintXyz(alice)
    evidence.assetId = assetId
    const { assetRules } = await admin<TaxiPolicy>('policy')
    await admin('policy', 'PATCH', { assetRules: [...policyRulesForPatch(assetRules), xyzRule(assetId)] })
    await importAsset(bob, assetId)
    await importAsset(dave, assetId)

    const send = async (
      to: Actor,
      mode = 'Receiver uses own sats',
      payer: 'receiver' | 'sender' | 'legacy' = mode === 'Receiver uses own sats' ? 'receiver' : 'sender',
    ) => {
      const known = await advances()
      await prepareSend(alice, await receiveRequest(to, assetId, 'receiver-sats', '1', payer), mode)
      await confirmSend(alice, true)
      const advance = await newAdvance(known)
      await expect.poll(async () => (await taxiStatus(advance.id)).state).toBe('locked')
      return advance
    }

    await test.step('C3: with no coin to merge, the sheet says so and Claim waits until Bob has one', async () => {
      const { id } = await send(bob, 'Receiver uses own sats', 'legacy')
      await expect(bob.page.getByText(TITLE, { exact: true })).toBeVisible()
      await expect(bob.page.getByTestId('claim-plan')).toHaveText(
        'Claiming needs a coin of at least 330 sats, and you have none.',
      )
      await expect(claimButton(bob.page)).toBeDisabled()
      await sheet(bob.page).getByRole('button', { name: 'Not now', exact: true }).click()
      await fund(faucet, bob, 1_000)
      await refocus(bob.page)
      await expect(bob.page.getByTestId('claim-plan')).toHaveText(MERGE)
      await expect(claimButton(bob.page)).toBeEnabled()
      await claimed(bob, id)
    })

    await test.step('C1 and C2: a recycle sheet in full, put off and offered again on focus', async () => {
      const { id } = await send(bob)
      await expect(bob.page.getByText(TITLE, { exact: true })).toBeVisible()
      await expect(bob.page.getByText('1 XYZ arrived through your Taxi.', { exact: true })).toBeVisible()
      await expect(bob.page.getByTestId('claim-fare')).toHaveText(
        'The sender paid the fare. Recycling repays Taxi’s loan using your own sats.',
      )
      await expect(bob.page.getByTestId('claim-plan')).toHaveText(MERGE)
      await expect(bob.page.getByTestId('unclaimed-note')).toHaveText(
        /^If you don't claim, Taxi can return this to the sender at .+\.$/,
      )
      await sheet(bob.page).getByRole('button', { name: 'Not now', exact: true }).click()
      await expect(bob.page.getByText(TITLE, { exact: true })).not.toBeVisible()
      await refocus(bob.page)
      await expect(bob.page.getByText(TITLE, { exact: true })).toBeVisible()
      await claimed(bob, id)
    })

    await test.step('C8: a claim whose request never reaches the emulator can be retried after reload', async () => {
      const parties = { alice: alice.address, bob: bob.address, taxi: operatorAddress() }
      const before = await ledger(parties, assetId)
      const { id } = await send(bob)
      const locked = await ledger(parties, assetId)
      const { emulatorUrl } = (await (await fetch(`${required('TAXI_E2E_BASE_URL')}/v1/info`)).json()) as {
        emulatorUrl: string
      }
      const emulator = `${emulatorUrl.replace(/\/$/, '')}/**`
      let attempts = 0
      await bob.page.route(emulator, async (route) => {
        if (route.request().method() !== 'POST') return route.continue()
        attempts++
        await route.abort()
      })
      try {
        await claimButton(bob.page).click()
        await expect(bob.page.getByTestId('claim-spent')).toHaveText(
          'This claim was already attempted. Reload the wallet to retry.',
        )
        expect(attempts).toBeGreaterThan(0)
        await expect(claimButton(bob.page)).toBeDisabled()
        expect((await taxiStatus(id)).state).toBe('locked')
        expect(await ledger(parties, assetId)).toEqual(locked)
      } finally {
        await bob.page.unroute(emulator)
      }
      await bob.page.reload()
      await expect(bob.page.getByText(TITLE, { exact: true })).toBeVisible()
      await claimed(bob, id)
      await expectLedger(parties, assetId, {
        alice: shift(before.alice, 0n, -1n),
        bob: shift(before.bob, 0n, 1n),
        taxi: before.taxi,
      })
    })

    await test.step('C5: while the claim feed is down no sheet appears; once it is back the sheet does', async () => {
      const feed = '**/v1/claims/events**'
      // A route, not the proxy: its drop holds an event stream open forever, and the feed never reconnects.
      await bob.page.route(feed, (route) => route.abort())
      await bob.page.reload()
      await expect(bob.page.getByTestId('home-action-receive')).toBeVisible()
      const { id } = await send(bob)
      await bob.page.waitForTimeout(15_000)
      await expect(bob.page.getByText(TITLE, { exact: true })).not.toBeVisible()
      await bob.page.unroute(feed)
      await expect(bob.page.getByText(TITLE, { exact: true })).toBeVisible({ timeout: 60_000 })
      await claimed(bob, id)
    })

    await test.step('C6: a locked wallet shows no sheet; unlocking brings it up', async () => {
      const password = randomBytes(12).toString('hex')
      const request = await receiveRequest(bob, assetId)
      await navigateToSettings(bob.page)
      await bob.page.getByText(tr.settings.lock, { exact: true }).click()
      await bob.page.getByText(tr.settings.setPassword).click()
      await bob.page.locator('div[data-testid="new-password"] input').fill(password)
      await bob.page.locator('div[data-testid="confirm-password"] input').fill(password)
      await bob.page.getByText(tr.components.savePassword).click()
      await bob.page.getByLabel(tr.common.back).click()
      await bob.page.getByLabel(tr.common.back).click()
      await navigateToSettings(bob.page)
      await bob.page.getByText(tr.settings.lock, { exact: true }).click()
      await bob.page.getByText(tr.settings.lockWallet).click()
      await expect(bob.page.getByText(tr.unlock.insertPassword)).toBeVisible()
      const known = await advances()
      await prepareSend(alice, request, 'Receiver uses own sats')
      await confirmSend(alice, true)
      const { id } = await newAdvance(known)
      await expect.poll(async () => (await taxiStatus(id)).state).toBe('locked')
      await bob.page.waitForTimeout(15_000)
      await expect(bob.page.getByText(TITLE, { exact: true })).not.toBeVisible()
      await bob.page.locator('div[data-testid="password"] input').fill(password)
      await bob.page.getByText(tr.unlock.unlockWallet).click()
      await expect(bob.page.getByText(TITLE, { exact: true })).toBeVisible()
      await claimed(bob, id)
    })

    await test.step('Free deliveries drain after a feed outage, reusing one receiver coin', async () => {
      const queuedBob = await join('Bob automatic', { sats: 1_000, autoClaimFreeTaxi: true })
      await importAsset(queuedBob, assetId)
      const request = await receiveRequest(queuedBob, assetId)
      const indexer = new RestIndexerProvider(required('TAXI_E2E_ARKD_URL'))
      const coins = async () =>
        (
          await indexer.getVtxos({
            scripts: [hex.encode(ArkAddress.decode(queuedBob.address).pkScript)],
            spendableOnly: true,
          })
        ).vtxos
      await expect.poll(async () => (await coins()).map(({ value }) => String(value))).toEqual(['1000'])
      const [funding] = await coins()
      const parties = { alice: alice.address, bob: queuedBob.address, taxi: operatorAddress() }
      const before = await ledger(parties, assetId)
      const known = await advances()
      const feed = '**/v1/claims/events**'
      let aborted = 0
      await queuedBob.page.route(feed, async (route) => {
        aborted++
        await route.abort()
      })
      try {
        await queuedBob.page.reload()
        await expect(queuedBob.page.getByTestId('home-action-receive')).toBeVisible()
        await expect.poll(() => aborted).toBeGreaterThan(0)
        for (let i = 0; i < 3; i++) {
          await prepareSend(alice, request, 'Receiver uses own sats')
          await expect(alice.page.getByTestId('taxi-confirm-costs')).toContainText('Free')
          await confirmSend(alice, true)
          await expect
            .poll(async () => (await newAdvances(known)).map(({ state }) => state))
            .toEqual(Array(i + 1).fill('locked'))
        }
        const queued = await newAdvances(known)
        expect(queued.map(({ topup }) => topup)).toEqual(['330', '330', '330'])
        await expect(queuedBob.page.getByText(TITLE, { exact: true })).not.toBeVisible()
        await expectLedger(parties, assetId, {
          alice: shift(before.alice, 0n, -3n),
          bob: before.bob,
          taxi: shift(before.taxi, -990n),
        })
      } finally {
        await queuedBob.page.unroute(feed)
      }
      await expect
        .poll(async () => (await newAdvances(known)).map(({ state }) => state))
        .toEqual(['recycled', 'recycled', 'recycled'])
      const settled = await newAdvances(known)
      const txids = settled.map(({ spentTxid }) => spentTxid!)
      expect(txids.every((txid) => /^[0-9a-f]{64}$/.test(txid))).toBe(true)
      expect(new Set(txids).size).toBe(3)
      await expectLedger(parties, assetId, {
        alice: shift(before.alice, 0n, -3n),
        bob: shift(before.bob, 0n, 3n),
        taxi: before.taxi,
      })
      await expect(queuedBob.page.getByText(TITLE, { exact: true })).not.toBeVisible()
      await expect(await taxiRows(queuedBob, 'Claimed')).toHaveCount(3)
      await expect(async () => {
        const raw = await indexer.getVirtualTxs(txids)
        expect(raw.txs).toHaveLength(3)
        const claims = raw.txs.map((psbt) => Transaction.fromPSBT(base64.decode(psbt)))
        const checkpoints = await indexer.getVirtualTxs(claims.map((tx) => hex.encode(tx.getInput(1).txid!)))
        expect(checkpoints.txs).toHaveLength(3)
        const inputByClaim = new Map(
          checkpoints.txs.map((psbt) => {
            const checkpoint = Transaction.fromPSBT(base64.decode(psbt))
            return [checkpoint.id, checkpoint.getInput(0)]
          }),
        )
        let cursor = { txid: funding.txid, vout: funding.vout }
        for (let i = 0; i < 3; i++) {
          const next = claims.find((tx) => {
            const input = inputByClaim.get(hex.encode(tx.getInput(1).txid!))!
            return hex.encode(input.txid!) === cursor.txid && input.index === cursor.vout
          })
          expect(next, 'each automatic claim spends the preceding receiver change').toBeDefined()
          expect(next!.getOutput(0).amount).toBe(330n)
          expect(next!.getOutput(1).amount).toBe(1_000n)
          cursor = { txid: next!.id, vout: 1 }
        }
        const final = await coins()
        expect(final).toHaveLength(1)
        expect({ txid: final[0].txid, vout: final[0].vout }).toEqual(cursor)
      }).toPass({ timeout: 60_000 })
      evidence.automaticQueue = { transfers: settled, before, after: await ledger(parties, assetId) }
    })

    await test.step('C4 and C7: on a phone, Dave claims a purchased carrier without sats of his own', async () => {
      const parties = { dave: dave.address, taxi: operatorAddress() }
      const before = await ledger(parties, assetId)
      const { id } = await send(dave, 'Sender pays asset fare')
      await expect(dave.page.getByText(TITLE, { exact: true })).toBeVisible()
      await expect(dave.page.getByText('1 XYZ arrived through your Taxi.', { exact: true })).toBeVisible()
      await expect(dave.page.getByTestId('claim-fare')).toHaveText(
        'The sender paid the fare and carrier. You do not need sats to claim.',
      )
      await expect(dave.page.getByTestId('claim-plan')).toHaveText(
        'The sender paid for the carrier. You receive 330 sats with no sats needed.',
      )
      await expect(claimButton(dave.page)).toBeInViewport()
      await claimed(dave, id, 'purchased')
      await expectLedger(parties, assetId, {
        dave: shift(before.dave, 330n, 1n),
        taxi: shift(before.taxi, -330n, 1n),
      })
    })
  })
})
