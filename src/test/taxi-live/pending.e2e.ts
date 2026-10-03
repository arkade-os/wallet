import { expect, test } from '@playwright/test'
import { dismissPaymentSuccess, navigateHome } from '../e2e/utils'
import {
  admin,
  advances,
  claim,
  control,
  expectLedger,
  importAsset,
  ledger,
  mintXyz,
  newAdvance,
  newAdvances,
  operatorAddress,
  policyRulesForPatch,
  prepareSend,
  receiveRequest,
  shift,
  stage,
  taxiConfirmation,
  taxiStatus,
  tr,
  withPolicy,
  xyzRule,
  type Actor,
  type TaxiPolicy,
} from './actors'

const PENDING = 'Payment may have been submitted; retry checks the same transfer'
const CHECK = 'Check Taxi payment'
const pendingKey = async (alice: Actor) => {
  const pubkey = await alice.page.evaluate(() => JSON.parse(localStorage.getItem('config') ?? '{}').pubkey as string)
  return `directTaxiPending:regtest:${pubkey.slice(2)}`
}
const journaled = async (alice: Actor) => {
  const key = await pendingKey(alice)
  return alice.page.evaluate((k) => localStorage.getItem(k) !== null, key)
}
const checkPayment = async (alice: Actor) => {
  await navigateHome(alice.page)
  await alice.page.getByText(tr.wallet.send, { exact: true }).click()
  await alice.page.getByRole('button', { name: CHECK, exact: true }).click()
}

test('A Taxi payment whose outcome the wallet did not see', { tag: '@pending' }, async ({ browser }, testInfo) => {
  await stage(browser, testInfo, async ({ join, evidence }) => {
    const alice = await join('Alice', { sats: 5_000 })
    const bob = await join('Bob', { sats: 1_000 })
    const assetId = await mintXyz(alice)
    evidence.assetId = assetId
    const { assetRules } = await admin<TaxiPolicy>('policy')
    await admin('policy', 'PATCH', { assetRules: [...policyRulesForPatch(assetRules), xyzRule(assetId)] })
    await importAsset(bob, assetId)
    const parties = { alice: alice.address, bob: bob.address, taxi: operatorAddress() }
    let request = ''

    // Quotes a recycle for Bob and stops at Alice's confirmation sheet.
    const quote = async () => {
      const known = await advances()
      request = await receiveRequest(bob, assetId)
      await prepareSend(alice, request, 'Receiver uses own sats')
      await taxiConfirmation(alice)
      return newAdvance(known)
    }
    const dropLockupAnswer = (id: string) =>
      control('configure', {
        target: 'taxi',
        path: `/v1/transfers/${id}/lockup`,
        method: 'POST',
        mode: 'drop',
        once: false,
      })

    await test.step('P2: another tab cannot start a second Taxi payment while one is unconfirmed', async () => {
      const before = await ledger(parties, assetId)
      const { id } = await quote()
      const known = await advances()
      await dropLockupAnswer(id)
      await alice.page.getByRole('button', { name: 'Pay', exact: true }).click()
      await expect(alice.page.getByText(PENDING, { exact: true })).toBeVisible()
      await control('reset')
      expect(await journaled(alice)).toBe(true)
      const tab = await alice.page.context().newPage()
      try {
        await tab.goto('/')
        await expect(tab.getByTestId('home-action-receive')).toBeVisible()
        await tab.getByText(tr.wallet.send, { exact: true }).click()
        await tab.locator('input[name="send-address"]').fill(request)
        await expect(tab.getByRole('button', { name: CHECK, exact: true })).toBeEnabled()
        await expect(tab.locator('input[name="send-amount"]')).not.toBeEditable()
        await expect(tab.getByTestId('taxi-send-mode')).toBeDisabled()
        await tab.getByRole('button', { name: CHECK, exact: true }).click()
        await dismissPaymentSuccess(tab)
      } finally {
        await tab.close()
      }
      expect(await journaled(alice)).toBe(false)
      expect(await newAdvances(known)).toEqual([])
      await claim(bob, /merges with the delivery/)
      await expect.poll(async () => (await taxiStatus(id)).state).toBe('recycled')
      await expectLedger(parties, assetId, {
        alice: shift(before.alice, 0n, -1n),
        bob: shift(before.bob, 0n, 1n),
        taxi: before.taxi,
      })
    })

    await test.step('P3: a lockup that never reached the Taxi before its quote expired sends nothing', async () => {
      await withPolicy({ quoteTtlSeconds: 20 }, async () => {
        const before = await ledger(parties, assetId)
        const { id } = await quote()
        await control('configure', {
          target: 'taxi',
          path: `/v1/transfers/${id}/lockup`,
          method: 'POST',
          mode: 'pause',
          phase: 'request',
        })
        await alice.page.getByRole('button', { name: 'Pay', exact: true }).click()
        await expect(alice.page.getByText(PENDING, { exact: true })).toBeVisible({ timeout: 20_000 })
        await expect.poll(async () => (await taxiStatus(id)).state, { timeout: 120_000 }).toBe('expired')
        await control('reset')
        await checkPayment(alice)
        await expect(alice.page.getByTestId('error-message')).toHaveText(
          'Taxi quote expired before payment submission; no payment was sent.',
        )
        await expect(alice.page.getByRole('button', { name: tr.common.continue, exact: true })).toBeVisible()
        const expired = await taxiStatus(id)
        expect([expired.outpoint, expired.submissionPhase]).toEqual([undefined, undefined])
        expect(await journaled(alice)).toBe(false)
        expect(await ledger(parties, assetId)).toEqual(before)
      })
    })
  })
})
