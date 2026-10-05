import { devices, expect, test, type Page } from '@playwright/test'
import { randomBytes } from 'node:crypto'
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
  operatorAddress,
  policyRulesForPatch,
  prepareSend,
  receiveRequest,
  required,
  shift,
  sheet,
  stage,
  taxiStatus,
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
