import { expect, test, type Page } from '@playwright/test'
import { decodeBip21 } from '../../lib/bip21'
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

const satsRequest = async (
  bob: Actor,
  fare: string | null,
  payer: 'receiver' | 'sender' = 'receiver',
): Promise<string> => {
  await navigateHome(bob.page)
  await bob.page.getByText(tr.wallet.receive, { exact: true }).click()
  await enterReceiveAmount(bob.page, String(SATS))
  if (fare || payer === 'sender') {
    await bob.page.getByRole('button', { name: /Taxi delivery/ }).click()
    await bob.page
      .getByRole('radio', {
        name: payer === 'sender' ? 'Sender covers carrier' : /^I have sats(?: · Free)?$/,
        exact: true,
      })
      .click()
    await expect
      .poll(async () => decodeBip21((await bob.page.getByTestId('bip21').textContent())!))
      .toMatchObject({
        satoshis: SATS,
        taxi: { url: required('TAXI_E2E_BASE_URL'), payer },
      })
  }
  const request = (await bob.page.getByTestId('bip21').textContent())!
  expect(request).not.toContain('taxikey=')
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

      // Alice's sheet and Bob's claim for an exact amount; the claim merges Bob's coin, so it grows by SATS.
      const payAndClaim = async (recipient: string) => {
        const known = await advances()
        const before = await ledger(parties, '')
        await openSatsSend(alice, recipient, SATS, RECYCLE)
        await alice.page.getByRole('button', { name: tr.common.continue, exact: true }).click()
        const costs = alice.page.getByTestId('taxi-confirm-costs')
        await expect(costs).toContainText(`Send ${SATS} sats. Service fee: Free. Taxi adds ${TOPUP} sats`)
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

      await test.step('S4: a priced sats fare cannot preserve an exact sub-dust amount and quotes nothing', async () => {
        const rule = satsRule(null, {
          fares: [{ id: 'sats', currency: { kind: 'sats' }, pricing: { kind: 'flat', units: '1' } }],
        })
        await withPolicy({ assetRules: [rule], quoteTtlSeconds: 20 }, async () => {
          const before = await ledger(parties, '')
          const known = await advances()
          await navigateHome(bob.page)
          await bob.page.getByText(tr.wallet.receive, { exact: true }).click()
          await enterReceiveAmount(bob.page, String(SATS))
          await expect(
            bob.page.getByText("Taxi unavailable: it doesn't let you claim by merging the delivery into a coin", {
              exact: true,
            }),
          ).toBeVisible()
          await expect(bob.page.getByRole('button', { name: /Taxi delivery/ })).toHaveCount(0)
          const bip21 = bob.page.getByTestId('bip21')
          await expect(bip21).not.toContainText('taxi=')
          const request = `${await bip21.textContent()}&taxi=${encodeURIComponent(taxiUrl)}&taxifare=sats`
          expect(decodeBip21(request).taxi).toEqual({ url: taxiUrl, fareId: 'sats' })
          await navigateHome(bob.page)
          await openSatsSend(alice, request, SATS)
          await noTaxiOffered(alice.page, 'it cannot deliver this exact amount')
          expect(await newAdvances(known)).toEqual([])
          await expectLedger(parties, '', before)
        })
      })

      await withPolicy({ assetRules: [satsRule(null)] }, async () => {
        await test.step('S1: Alice sends an exact sub-dust amount to Bob’s address; Bob ends with exactly it', () =>
          payAndClaim(bob.address))

        await test.step('S2: Bob asks for the amount through his Taxi; Alice pays the Taxi he named', async () => {
          const request = await satsRequest(bob, 'sats')
          expect(request).toContain(`amount=0.000001&taxi=${encodeURIComponent(taxiUrl)}&taxipayer=receiver`)
          expect(request).not.toContain('taxifare=')
          await payAndClaim(request)
        })

        await test.step('S3: at dust no Taxi is offered, and a plain sub-dust send leaves the Taxi out', async () => {
          await openSatsSend(alice, bob.address, 330)
          await expect(alice.page.getByTestId('taxi-send-mode')).toHaveCount(0)
          await expect(alice.page.getByText(/^Taxi unavailable|^Checking Taxi/)).toHaveCount(0)
          const known = await advances()
          const before = await ledger(parties, '')
          await openSatsSend(alice, bob.address, SATS)
          await expect(alice.page.getByTestId('taxi-send-mode')).toContainText(RECYCLE)
          await alice.page.getByTestId('taxi-send-mode').click()
          await expect(alice.page.getByRole('radio', { name: 'Direct delivery, no claim', exact: true })).toHaveCount(0)
          await alice.page.getByRole('radio', { name: 'No Taxi: sub-dust coin', exact: true }).click()
          await alice.page.getByRole('button', { name: tr.common.continue, exact: true }).click()
          await confirmSend(alice, false)
          await expectLedger(parties, '', { ...before, alice: shift(before.alice, BigInt(-SATS)) })
          expect(await newAdvances(known)).toEqual([])
        })

        await test.step('A3/S4: a sender-covered request refuses exact sub-dust delivery without moving funds', async () => {
          const known = await advances()
          const before = await ledger(parties, '')
          const request = await satsRequest(bob, null, 'sender')
          expect(decodeBip21(request).taxi?.fareId).toBeUndefined()
          await openSatsSend(alice, request, SATS)
          await noTaxiOffered(
            alice.page,
            'Sender-covered delivery cannot preserve this exact sub-dust amount. Ask the receiver to request at least the dust amount or use their own sats.',
          )
          await expect(alice.page.getByRole('button', { name: tr.common.continue, exact: true })).toBeDisabled()
          expect(await newAdvances(known)).toEqual([])
          await expectLedger(parties, '', before)
        })
      })
    })
  },
)
