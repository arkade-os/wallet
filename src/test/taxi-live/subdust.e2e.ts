import { expect, test, type Page } from '@playwright/test'
import { navigateHome } from '../e2e/utils'
import {
  advances,
  claim,
  confirmSend,
  enterReceiveAmount,
  expectLedger,
  ledger,
  newAdvance,
  newAdvances,
  openSatsSend,
  operatorAddress,
  required,
  satsRule,
  shift,
  stage,
  taxiStatus,
  tr,
  withPolicy,
  type Actor,
} from './actors'

// Any amount the Taxi can carry exactly; 329 would also be what a Taxi without paymentSats delivers.
const SATS = 100
const TOPUP = 330 - SATS
const RECYCLE = 'Receiver uses own sats'

const satsRequest = async (bob: Actor, fare: string | null): Promise<string> => {
  await navigateHome(bob.page)
  await bob.page.getByText(tr.wallet.receive, { exact: true }).click()
  await enterReceiveAmount(bob.page, String(SATS))
  if (fare) {
    await bob.page.getByRole('button', { name: 'Taxi: off', exact: true }).click()
    await bob.page.getByRole('option', { name: `${fare} · 0 sats`, exact: true }).click()
  }
  const request = (await bob.page.getByTestId('bip21').textContent())!
  await navigateHome(bob.page)
  return request
}

const noTaxiOffered = async (page: Page, reason: string) => {
  await expect(page.getByText(`Taxi unavailable: ${reason}`, { exact: true })).toBeVisible()
  await expect(page.getByTestId('taxi-send-mode')).toHaveCount(0)
}

test(
  'Sub-dust bitcoin through the Taxi, delivered as exactly the amount sent',
  { tag: '@subdust' },
  async ({ browser }, testInfo) => {
    await stage(browser, testInfo, async ({ join }) => {
      const alice = await join('Alice', { sats: 5_000 })
      const bob = await join('Bob', { sats: 1_000 })
      const parties = { alice: alice.address, bob: bob.address, taxi: operatorAddress() }
      const taxiUrl = required('TAXI_E2E_BASE_URL')
      const { operatorKey } = (await (await fetch(`${taxiUrl}/v1/info`)).json()) as { operatorKey: string }

      // Alice's sheet and Bob's claim for an exact amount; the claim merges Bob's coin, so it grows by SATS.
      const payAndClaim = async (recipient: string) => {
        const known = await advances()
        const before = await ledger(parties, '')
        await openSatsSend(alice, recipient, SATS, RECYCLE)
        await alice.page.getByRole('button', { name: tr.common.continue, exact: true }).click()
        const costs = alice.page.getByTestId('taxi-confirm-costs')
        await expect(costs).toContainText(`Send ${SATS} sats. Fare: 0 sats. Taxi adds ${TOPUP} sats`)
        await confirmSend(alice, true)
        const advance = await newAdvance(known)
        expect(advance).toMatchObject({ kind: 'covenant', dust: '330', topup: String(TOPUP) })
        expect(advance.assetId).toBeUndefined()
        const coin = BigInt(before.bob.sats)
        await expect(bob.page.getByText(`${SATS} sats arrived through your Taxi.`, { exact: true })).toBeVisible()
        await claim(
          bob,
          new RegExp(
            `Your ${coin.toLocaleString('en-US')} sats coin merges with the delivery and comes back as ${(coin + BigInt(SATS)).toLocaleString('en-US')} sats\\.`,
          ),
        )
        await expectLedger(parties, '', {
          alice: shift(before.alice, BigInt(-SATS)),
          bob: shift(before.bob, BigInt(SATS)),
          taxi: before.taxi,
        })
        await expect.poll(async () => (await taxiStatus(advance.id)).state).toBe('recycled')
      }

      await test.step('S4: a disabled bitcoin rule offers no Taxi on either side', async () => {
        const known = await advances()
        await withPolicy({ assetRules: [satsRule(null, { enabled: false })] }, async () => {
          const reason = "it doesn't carry sub-dust bitcoin"
          await openSatsSend(alice, bob.address, SATS)
          await noTaxiOffered(alice.page, reason)
          await navigateHome(bob.page)
          await bob.page.getByText(tr.wallet.receive, { exact: true }).click()
          await enterReceiveAmount(bob.page, String(SATS))
          await expect(bob.page.getByText(`Taxi unavailable: ${reason}`, { exact: true })).toBeVisible()
          await expect(bob.page.getByTestId('bip21')).not.toContainText('taxi=')
        })
        expect(await newAdvances(known)).toEqual([])
      })

      await test.step('S4: a priced sats fare offers direct delivery only; canceling its real quote moves no funds', async () => {
        const rule = satsRule(null, {
          fares: [{ id: 'sats', currency: { kind: 'sats' }, pricing: { kind: 'flat', units: '1' } }],
        })
        await withPolicy({ assetRules: [rule], quoteTtlSeconds: 20 }, async () => {
          const before = await ledger(parties, '')
          const known = await advances()
          await navigateHome(bob.page)
          await bob.page.getByText(tr.wallet.receive, { exact: true }).click()
          await enterReceiveAmount(bob.page, String(SATS))
          await bob.page.getByRole('button', { name: 'Taxi: off', exact: true }).click()
          await expect(bob.page.getByRole('option')).toHaveText(['No Taxi', 'sats · 1 sats'])
          await bob.page.getByRole('option', { name: 'sats · 1 sats', exact: true }).click()
          const request = (await bob.page.getByTestId('bip21').textContent())!
          expect(request).toContain(`taxikey=${operatorKey}&taxifare=sats`)
          await navigateHome(bob.page)
          await openSatsSend(alice, request, SATS)
          await alice.page.getByTestId('taxi-send-mode').click()
          await expect(alice.page.getByRole('menuitem')).toHaveText([
            'No Taxi: sub-dust coin',
            'Direct delivery, no claim',
          ])
          await alice.page.getByRole('menuitem', { name: 'Direct delivery, no claim', exact: true }).click()
          await alice.page.getByRole('button', { name: tr.common.continue, exact: true }).click()
          await expect(alice.page.getByTestId('taxi-confirm-costs')).toContainText(
            `Send ${SATS} sats. Fare: 1 sats. Taxi adds ${TOPUP} sats`,
          )
          const advance = await newAdvance(known)
          expect(advance).toMatchObject({ kind: 'sponsored', dust: '330', topup: String(TOPUP) })
          await alice.page.getByRole('button', { name: 'Cancel', exact: true }).click()
          await expectLedger(parties, '', before)
          await expect.poll(async () => (await taxiStatus(advance.id, undefined, true)).state).toBe('expired')
          expect((await taxiStatus(advance.id, undefined, true)).outpoint).toBeUndefined()
        })
      })

      await withPolicy({ assetRules: [satsRule(null)] }, async () => {
        await test.step('S1: Alice sends an exact sub-dust amount to Bob’s address; Bob ends with exactly it', () =>
          payAndClaim(bob.address))

        await test.step('S2: Bob asks for the amount through his Taxi; Alice pays the Taxi he named', async () => {
          const request = await satsRequest(bob, 'sats')
          expect(request).toContain(
            `amount=0.000001&taxi=${encodeURIComponent(taxiUrl)}&taxikey=${operatorKey}&taxifare=sats`,
          )
          await payAndClaim(request)
        })

        await test.step('S3: at dust no Taxi is offered, and a plain sub-dust send leaves the Taxi out', async () => {
          await openSatsSend(alice, bob.address, 330)
          await expect(alice.page.getByTestId('taxi-send-mode')).toHaveCount(0)
          await expect(alice.page.getByText(/^Taxi unavailable|^Checking Taxi/)).toHaveCount(0)
          const known = await advances()
          const before = await ledger(parties, '')
          await openSatsSend(alice, bob.address, SATS)
          await expect(alice.page.getByTestId('taxi-send-mode')).toHaveText('Carrier: No Taxi: sub-dust coin')
          await alice.page.getByRole('button', { name: tr.common.continue, exact: true }).click()
          await confirmSend(alice, false)
          await expectLedger(parties, '', { ...before, alice: shift(before.alice, BigInt(-SATS)) })
          expect(await newAdvances(known)).toEqual([])
        })

        await test.step('A3/S4: direct bitcoin delivery funds Bob without a claim', async () => {
          const known = await advances()
          const before = await ledger(parties, '')
          await openSatsSend(alice, bob.address, SATS, 'Direct delivery, no claim')
          await alice.page.getByRole('button', { name: tr.common.continue, exact: true }).click()
          await expect(alice.page.getByTestId('taxi-confirm-costs')).toContainText(
            `Send ${SATS} sats. Fare: 0 sats. Taxi adds ${TOPUP} sats`,
          )
          await confirmSend(alice, true)
          const advance = await newAdvance(known)
          expect(advance).toMatchObject({ kind: 'sponsored', dust: '330', topup: String(TOPUP) })
          expect(advance.assetId).toBeUndefined()
          await expect.poll(async () => (await taxiStatus(advance.id, undefined, true)).state).toBe('locked')
          expect((await taxiStatus(advance.id, undefined, true)).outpoint).toBeDefined()
          await expectLedger(parties, '', {
            alice: shift(before.alice, BigInt(-SATS)),
            bob: shift(before.bob, 330n),
            taxi: shift(before.taxi, BigInt(-TOPUP)),
          })
          expect(await newAdvances(known)).toHaveLength(1)
          await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).not.toBeVisible()
        })
      })
    })
  },
)
