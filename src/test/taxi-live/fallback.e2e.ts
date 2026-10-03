import { expect, test } from '@playwright/test'
import { navigateHome } from '../e2e/utils'
import {
  admin,
  advances,
  confirmSend,
  control,
  expectLedger,
  importAsset,
  ledger,
  mintXyz,
  newAdvances,
  openAssetReceive,
  operatorAddress,
  policyRulesForPatch,
  prepareSend,
  receiveRequest,
  recycleOne,
  shift,
  stage,
  taxiReady,
  xyzRule,
  type TaxiPolicy,
} from './actors'

test(
  'When the Taxi is paused, unreachable or degraded, nothing is debited and a normal send works',
  {
    tag: '@fallback',
  },
  async ({ browser }, testInfo) => {
    await stage(browser, testInfo, async ({ join, evidence }) => {
      const alice = await join('Alice', { sats: 5_000 })
      const bob = await join('Bob', { sats: 1_000 })
      const assetId = await mintXyz(alice)
      evidence.assetId = assetId
      const { assetRules } = await admin<TaxiPolicy>('policy')
      await admin('policy', 'PATCH', { assetRules: [...policyRulesForPatch(assetRules), xyzRule(assetId)] })
      await importAsset(bob, assetId)
      const parties = { alice: alice.address, bob: bob.address, taxi: operatorAddress() }
      const request = await receiveRequest(bob, assetId)
      const unavailable = (reason: string) => bob.page.getByText(`Taxi unavailable: ${reason}`, { exact: true })

      await test.step('F1: a paused Taxi is offered on no request', async () => {
        await admin('pause', 'POST')
        try {
          await openAssetReceive(bob, assetId)
          await expect(unavailable('it is paused')).toBeVisible()
        } finally {
          await admin('resume', 'POST')
          await expect.poll(() => taxiReady(), { timeout: 120_000 }).toBe(true)
        }
        await navigateHome(bob.page)
      })

      await test.step('F2: an unreachable Taxi fails the send and drops off the request; a normal send works', async () => {
        const known = await advances()
        const before = await ledger(parties, assetId)
        await control('configure', { target: 'taxi', path: '/v1/info', method: 'GET', mode: 'drop', once: false })
        try {
          await prepareSend(alice, request, 'Receiver uses own sats')
          await expect(alice.page.getByTestId('error-message')).toBeVisible()
          await openAssetReceive(bob, assetId)
          await expect(unavailable("it can't be reached")).toBeVisible()
          await expect(bob.page.getByTestId('bip21')).not.toContainText('taxi=')
        } finally {
          await control('reset')
        }
        await navigateHome(bob.page)
        await prepareSend(alice, request)
        await confirmSend(alice, false)
        await expectLedger(parties, assetId, {
          alice: shift(before.alice, -330n, -1n),
          bob: shift(before.bob, 330n, 1n),
          taxi: before.taxi,
        })
        expect(await newAdvances(known)).toEqual([])
      })

      await test.step('F3: a Taxi that sees a different Arkade signer quotes nothing until it sees the real one', async () => {
        const known = await advances()
        const before = await ledger(parties, assetId)
        // Rewrites arkd's signerPubkey for the Taxi only; the wallet reaches arkd directly.
        await control('configure', { target: 'arkd', path: '/v1/info', mode: 'identity', once: false })
        try {
          await expect.poll(() => taxiReady(), { timeout: 120_000 }).toBe(false)
          await prepareSend(alice, request, 'Receiver uses own sats')
          await expect(alice.page.getByTestId('error-message')).toBeVisible()
          await expect(alice.page.getByTestId('taxi-confirm-costs')).not.toBeVisible()
          expect(await newAdvances(known)).toEqual([])
          expect(await ledger(parties, assetId)).toEqual(before)
        } finally {
          // The SDK suite runs next on this stack, so readiness must come back either way.
          await control('reset')
          await expect.poll(() => taxiReady(), { timeout: 120_000 }).toBe(true)
        }
        await navigateHome(alice.page)
        await recycleOne(alice, bob, assetId, request)
      })
    })
  },
)
