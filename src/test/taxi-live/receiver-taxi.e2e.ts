import { expect, test } from '@playwright/test'
import { ArkAddress } from '@arkade-os/sdk'
import { hex } from '@scure/base'
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
  recycleOne,
  required,
  satsRule,
  shift,
  stage,
  withPolicy,
  xyzRule,
  type Actor,
  type TaxiPolicy,
} from './actors'

type ProxyEvent = { at: number; target: string; method?: string; path: string }

const refusal = (actor: Actor) => actor.page.getByTestId('error-message')

test(
  'A receiver names his Taxi in a request; a payer uses it or is refused',
  { tag: '@receiver-taxi' },
  async ({ browser }, testInfo) => {
    await stage(browser, testInfo, async ({ join, evidence }) => {
      const alice = await join('Alice', { sats: 5_000 })
      const bob = await join('Bob', { sats: 1_000 })
      const carol = await join('Carol', { sats: 1_000 })
      const assetId = await mintXyz(alice)
      evidence.assetId = assetId
      const { assetRules } = await admin<TaxiPolicy>('policy')
      await admin('policy', 'PATCH', { assetRules: [...policyRulesForPatch(assetRules), xyzRule(assetId)] })
      await importAsset(bob, assetId)
      const parties = { alice: alice.address, bob: bob.address, carol: carol.address, taxi: operatorAddress() }
      const taxiUrl = required('TAXI_E2E_BASE_URL')
      const { operatorKey } = (await (await fetch(`${taxiUrl}/v1/info`)).json()) as { operatorKey: string }
      let request = ''

      await test.step('R5: a request offers no Taxi, or one fare per fare a receiver can pay', async () => {
        const bip21 = bob.page.getByTestId('bip21')
        await openAssetReceive(bob, assetId)
        await bob.page.getByRole('button', { name: 'Taxi: off', exact: true }).click()
        await expect(bob.page.getByRole('listbox', { name: 'Taxi fare' }).getByRole('option')).toHaveText([
          'No Taxi',
          'receiver-sats · 0 sats',
          'receiver-asset · 1 XYZ',
        ])
        await bob.page.getByRole('option', { name: 'receiver-sats · 0 sats', exact: true }).click()
        await expect(bip21).toContainText(
          `&taxi=${encodeURIComponent(taxiUrl)}&taxikey=${operatorKey}&taxifare=receiver-sats`,
        )
        await expect(
          bob.page.getByText('The payer needs no carrier; you pay this fare when you claim.', { exact: true }),
        ).toBeVisible()
        request = (await bip21.textContent())!
        await bob.page.getByRole('button', { name: 'Taxi: receiver-sats · 0 sats', exact: true }).click()
        await bob.page.getByRole('option', { name: 'No Taxi', exact: true }).click()
        await expect(bip21).not.toContainText('taxi=')
        await withPolicy({ assetRules: policyRulesForPatch(assetRules) }, async () => {
          await openAssetReceive(bob, assetId)
          await expect(
            bob.page.getByText("Taxi unavailable: it doesn't carry this asset", { exact: true }),
          ).toBeVisible()
          await expect(bip21).not.toContainText('taxi=')
        })
        await navigateHome(bob.page)
      })

      await test.step('R1: Alice pays through the Taxi the request names, and Bob merges it into his coin', async () => {
        const since = Date.now()
        const advance = await recycleOne(alice, bob, assetId, request)
        expect(advance).toMatchObject({
          kind: 'covenant',
          topup: '330',
          receiverKey: hex.encode(ArkAddress.decode(bob.address).vtxoTaprootKey),
          assetId: xyzRule(assetId).assetId,
        })
        const { events } = await control<{ events: ProxyEvent[] }>('events')
        expect(events.filter((e) => e.at >= since && e.target === 'taxi' && e.method === 'POST')).toContainEqual(
          expect.objectContaining({ path: '/v1/transfers' }),
        )
      })

      await test.step('R2: a Taxi key that does not match is refused before any quote; a normal send works', async () => {
        const known = await advances()
        const before = await ledger(parties, assetId)
        await prepareSend(
          alice,
          request.replace(/taxikey=[0-9a-f]{64}/, `taxikey=${'11'.repeat(32)}`),
          'Receiver uses own sats',
        )
        await expect(refusal(alice)).toHaveText('Taxi operator key changed')
        expect(await newAdvances(known)).toEqual([])
        await prepareSend(alice, request)
        await confirmSend(alice, false)
        await expectLedger(parties, assetId, {
          ...before,
          alice: shift(before.alice, -330n, -1n),
          bob: shift(before.bob, 330n, 1n),
        })
        expect(await newAdvances(known)).toEqual([])
      })

      await test.step('R3: an unreachable Taxi in the request fails visibly and debits nothing', async () => {
        const known = await advances()
        const before = await ledger(parties, assetId)
        const unreachable = request.replace(/&taxi=[^&]+/, `&taxi=${encodeURIComponent('http://127.0.0.1:9')}`)
        await prepareSend(alice, unreachable, 'Receiver uses own sats')
        await expect(refusal(alice)).toBeVisible()
        await navigateHome(alice.page)
        expect(await newAdvances(known)).toEqual([])
        expect(await ledger(parties, assetId)).toEqual(before)
      })

      await test.step('R4: Carol holds no XYZ, so the request routes to a solver, and none sells it', async () => {
        const known = await advances()
        const before = await ledger(parties, assetId)
        await prepareSend(carol, request)
        await expect(refusal(carol)).toBeVisible()
        await navigateHome(carol.page)
        expect(await newAdvances(known)).toEqual([])
        expect(await ledger(parties, assetId)).toEqual(before)
      })

      await test.step('A6: on mutinynet terms only a recycle is offered, and it goes through the "*" rule', async () => {
        await withPolicy({ assetRules: [satsRule(null), satsRule('*')] }, async () => {
          const known = await advances()
          await prepareSend(alice, request, 'Sender pays asset fare')
          await expect(refusal(alice)).toHaveText('Taxi does not support purchase claims')
          await prepareSend(alice, request, 'Sender sponsors carrier')
          await expect(refusal(alice)).toHaveText('Taxi offers no asset fare')
          expect(await newAdvances(known)).toEqual([])
          await recycleOne(alice, bob, assetId, request)
        })
      })
    })
  },
)
