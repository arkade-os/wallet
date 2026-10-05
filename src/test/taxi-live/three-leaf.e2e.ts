import { expect, test } from '@playwright/test'
import {
  admin,
  advances,
  claim,
  confirmSend,
  expectLeaves,
  expectLedger,
  fund,
  importAsset,
  ledger,
  mintXyz,
  newAdvance,
  openSatsSend,
  operatorAddress,
  policyRulesForPatch,
  prepareSend,
  receiveRequest,
  recycleOne,
  required,
  satsRule,
  shift,
  stage,
  taxiStatus,
  tr,
  withPolicy,
  xyzRule,
  type TaxiPolicy,
} from './actors'

// Run alone against a Taxi before b9613a8 for the red half: L2 then fails at the lockup, and the
// spec's evidence file records the advance's submissionPhase, failureCode and failureDetail (P4a).
test(
  'Wallets with a delegate leaf send and claim through the Taxi',
  { tag: '@three-leaf' },
  async ({ browser }, testInfo) => {
    await stage(browser, testInfo, async ({ faucet, join, evidence }) => {
      const alice = await join('Alice', { sats: 5_000 })
      const cleo = await join('Cleo', { leaves: 3, sats: 5_000 })
      const bob = await join('Bob', { leaves: 3, sats: 1_000 })
      const xyzA = await mintXyz(alice)
      const xyzC = await mintXyz(cleo)
      evidence.assets = { alice: xyzA, cleo: xyzC }
      const { assetRules } = await admin<TaxiPolicy>('policy')
      await admin('policy', 'PATCH', { assetRules: [...policyRulesForPatch(assetRules), xyzRule(xyzA), xyzRule(xyzC)] })
      await importAsset(bob, xyzA)
      await importAsset(bob, xyzC)

      await test.step('L0: each wallet has the leaves it asked for, and the 3-leaf ones read the stub delegator', async () => {
        await expectLeaves(alice, 2)
        await expectLeaves(cleo, 3)
        await expectLeaves(bob, 3)
        const hits = (await (await fetch(`${required('TAXI_E2E_DELEGATOR_URL')}/__hits`)).json()) as Record<
          string,
          number
        >
        expect(hits['GET /v1/delegator/info']).toBeGreaterThanOrEqual(1)
      })

      await test.step('L1: a 2-leaf sender pays a 3-leaf receiver, who claims with his own coin', () =>
        recycleOne(alice, bob, xyzA))

      await test.step('L2: a 3-leaf sender pays a 3-leaf receiver', () => recycleOne(cleo, bob, xyzC))

      await test.step('L3: the 3-leaf receiver sends back to the 2-leaf sender', () => recycleOne(bob, alice, xyzA))

      await test.step('L4: a 3-leaf sender sponsors a carrier, then buys one', async () => {
        const parties = { cleo: cleo.address, bob: bob.address, taxi: operatorAddress() }
        const sponsored = await ledger(parties, xyzC)
        let known = await advances()
        await prepareSend(cleo, await receiveRequest(bob, xyzC, null, '1', 'sender'), 'Sender sponsors carrier')
        await confirmSend(cleo, true)
        const { id } = await newAdvance(known)
        await expectLedger(parties, xyzC, {
          cleo: shift(sponsored.cleo, 0n, -2n),
          bob: shift(sponsored.bob, 330n, 1n),
          taxi: shift(sponsored.taxi, -330n, 1n),
        })
        await expect.poll(async () => (await taxiStatus(id, undefined, true)).state).toBe('locked')
        await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).not.toBeVisible()

        const purchased = await ledger(parties, xyzC)
        known = await advances()
        await prepareSend(cleo, await receiveRequest(bob, xyzC, null, '1', 'sender'), 'Sender pays asset fare')
        await confirmSend(cleo, true)
        const purchase = await newAdvance(known)
        await claim(bob, 'The sender paid for the carrier. You receive 330 sats with no sats needed.')
        await expectLedger(parties, xyzC, {
          cleo: shift(purchased.cleo, 0n, -2n),
          bob: shift(purchased.bob, 330n, 1n),
          taxi: shift(purchased.taxi, -330n, 1n),
        })
        await expect.poll(async () => (await taxiStatus(purchase.id)).state).toBe('purchased')
      })

      await test.step('L5: a 3-leaf sender sends an exact sub-dust amount', async () => {
        await withPolicy({ assetRules: [satsRule(null)] }, async () => {
          const parties = { cleo: cleo.address, bob: bob.address, taxi: operatorAddress() }
          const expectedCleoSats = Number((await ledger({ cleo: cleo.address }, '')).cleo.sats) + 1_000
          await fund(faucet, cleo, 1_000)
          await expect
            .poll(async () => Number((await cleo.page.getByTestId('main-balance').innerText()).replace(/[^\d.-]/g, '')))
            .toBe(expectedCleoSats)
          const before = await ledger(parties, '')
          const assetsBefore = await Promise.all(
            [xyzA, xyzC].map(async (assetId) => ({ assetId, balances: await ledger(parties, assetId) })),
          )
          const known = await advances()
          await openSatsSend(cleo, bob.address, 100, 'Receiver uses own sats')
          await cleo.page.getByRole('button', { name: tr.common.continue, exact: true }).click()
          await confirmSend(cleo, true)
          const { id } = await newAdvance(known)
          await claim(bob, 'Your 330 sats coin merges with the delivery and comes back as 430 sats.')
          await expectLedger(parties, '', {
            cleo: shift(before.cleo, -100n),
            bob: shift(before.bob, 100n),
            taxi: before.taxi,
          })
          for (const { assetId, balances } of assetsBefore) {
            await expectLedger(parties, assetId, {
              cleo: shift(balances.cleo, -100n),
              bob: shift(balances.bob, 100n),
              taxi: balances.taxi,
            })
          }
          await expect.poll(async () => (await taxiStatus(id)).state).toBe('recycled')
        })
      })
    })
  },
)
