import { expect, test } from '@playwright/test'
import { navigateHome } from '../utils'
import {
  actor,
  admin,
  advances,
  claim,
  fresh,
  importAsset,
  ledger,
  mint,
  pay,
  rule,
  send,
  shift,
  status,
  taxiUrl,
  restorePolicy,
  type Policy,
  type Advance,
} from './helpers'

test('Sub-dust approval, claim and live Taxi receipts', async ({ browser }, testInfo) => {
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({
        ...testInfo.project.use,
        ...testInfo.project.use.contextOptions,
        baseURL: testInfo.project.use.baseURL,
      }),
    ),
  )
  const policy = await admin<Policy>('policy')
  let known = await advances()
  try {
    await admin('policy', 'PATCH', { assetRules: [rule(null)] })
    const alice = await actor(await contexts[0].newPage(), 5000)
    const bob = await actor(await contexts[1].newPage(), 1000)
    const { arkAddress } = await admin<{ arkAddress: string }>('funding')
    const parties = { alice: alice.address, bob: bob.address, taxi: arkAddress }
    const before = await ledger(parties)
    await send(alice, bob.address, '100', 'Receiver uses own sats')
    await expect(alice.page.getByTestId('taxi-confirm-costs')).toContainText(
      'Send 100 sats. Service fee: Free. Taxi adds 330 sats',
    )
    await test.step('Leaving approval releases the payment lock without debiting anyone', async () => {
      await alice.page.goBack({ waitUntil: 'commit' })
      await expect(alice.page.getByTestId('home-action-receive')).toBeVisible()
      await expect(alice.page.getByTestId('taxi-confirm-costs')).not.toBeVisible()
      expect(await ledger(parties)).toEqual(before)
      known = await advances()
      await send(alice, bob.address, '100', 'Receiver uses own sats')
      await expect(alice.page.getByTestId('taxi-confirm-costs')).toBeVisible()
    })
    await pay(alice)
    const [transfer] = await fresh(known)
    expect(await fresh(known)).toHaveLength(1)
    expect(transfer).toMatchObject({ kind: 'covenant', topup: '330' })
    await test.step('The sender sees a pending delivery receipt', async () => {
      await navigateHome(alice.page)
      await alice.page.getByTestId('activity-view-all').click()
      const receipt = alice.page.getByTestId('tx-row').filter({
        has: alice.page.locator('.activity-row__meta', { hasText: /^Awaiting claim · / }),
      })
      await expect(receipt).toHaveCount(1)
      await receipt.click()
      await expect(alice.page.getByTestId('Transfer ID')).toContainText(transfer.id.slice(0, 11))
      await expect(alice.page.getByTestId('Delivery')).toHaveText('Awaiting claim')
    })
    await bob.page.bringToFront()
    await claim(bob, 'Your 1,000 sats coin merges with the delivery and comes back as 1,100 sats.')
    await alice.page.bringToFront()
    await test.step('The open sender receipt updates when the delivery is claimed', async () => {
      await expect
        .poll(
          async () => ({
            state: (await status(transfer.id)).state,
            delivery: await alice.page.getByTestId('Delivery').innerText(),
          }),
          { timeout: 60_000 },
        )
        .toEqual({ state: 'recycled', delivery: 'Claimed' })
      await expect(alice.page.getByTestId('Carrier sats')).toHaveText('Borrowed 330 sats')
    })
    await navigateHome(bob.page)
    await bob.page.getByTestId('activity-view-all').click()
    const row = bob.page
      .getByTestId('tx-row')
      .filter({ has: bob.page.locator('.activity-row__meta', { hasText: /^Claimed · / }) })
    await expect(row).toHaveCount(1)
    await row.click()
    await expect(bob.page.getByTestId('Transfer ID')).toContainText(transfer.id.slice(0, 11))
    await expect(bob.page.getByTestId('Carrier sats')).toHaveText('Borrowed 330 sats')
    await expect(bob.page.getByTestId('Delivery')).toHaveText('Claimed')
  } finally {
    await restorePolicy(policy)
    await Promise.all(contexts.map((context) => context.close()))
  }
})

for (const queuedOnly of [true, false]) {
  test(
    queuedOnly
      ? 'Assets: queued free claims recycle and preserve every balance'
      : 'Assets: purchase, sponsored delivery and paused refusal preserve every balance',
    async ({ browser }, testInfo) => {
      const contexts = await Promise.all(
        [0, 1, 2].map(() =>
          browser.newContext({
            ...testInfo.project.use,
            ...testInfo.project.use.contextOptions,
            baseURL: testInfo.project.use.baseURL,
          }),
        ),
      )
      const policy = await admin<Policy>('policy')
      try {
        const alice = await actor(await contexts[0].newPage(), 20_000)
        const bob = await actor(await contexts[1].newPage(), 1000, true)
        const dave = await actor(await contexts[2].newPage(), 0)
        const assetId = await mint(alice)
        await admin('policy', 'PATCH', { assetRules: [rule(null), rule(assetId)] })
        for (const receiver of [bob, dave]) await importAsset(receiver, assetId)
        const { arkAddress } = await admin<{ arkAddress: string }>('funding')
        const parties = { alice: alice.address, bob: bob.address, dave: dave.address, taxi: arkAddress }
        const request = (address: string, payer: string) =>
          `bitcoin:?ark=${address}&assetid=${assetId}&amount=1&taxi=${encodeURIComponent(taxiUrl)}&taxipayer=${payer}`
        const conserved = async (expected: Awaited<ReturnType<typeof ledger>>) => {
          await expect.poll(() => ledger(parties, assetId), { timeout: 60_000 }).toEqual(expected)
        }
        if (queuedOnly) {
          await test.step('Three pending free deliveries recycle one receiver coin after the wallet reopens', async () => {
            const before = await ledger(parties, assetId)
            const known = await advances()
            await bob.page.close()
            for (let i = 0; i < 3; i++) {
              await send(alice, request(bob.address, 'receiver'), '1', 'Receiver uses own sats')
              await pay(alice)
            }
            const queued = await fresh(known)
            expect(queued).toHaveLength(3)
            expect(queued.map(({ state }) => state)).toEqual(['locked', 'locked', 'locked'])
            await conserved({ ...before, alice: shift(before.alice, 0n, -3n), taxi: shift(before.taxi, -990n) })
            bob.page = await contexts[1].newPage()
            await bob.page.goto('/')
            await expect
              .poll(async () => (await fresh(known)).map(({ state }) => state), { timeout: 90_000 })
              .toEqual(['recycled', 'recycled', 'recycled'])
            const settled = await fresh(known)
            expect(new Set(settled.map(({ spentTxid }) => spentTxid)).size).toBe(3)
            expect(settled.every(({ spentTxid }) => /^[0-9a-f]{64}$/.test(spentTxid ?? ''))).toBe(true)
            await conserved({ ...before, alice: shift(before.alice, 0n, -3n), bob: shift(before.bob, 0n, 3n) })
            await navigateHome(bob.page)
            await bob.page.getByTestId('activity-view-all').click()
            await expect(
              bob.page
                .getByTestId('tx-row')
                .filter({ has: bob.page.locator('.activity-row__meta', { hasText: /^Claimed · / }) }),
            ).toHaveCount(3)
          })
        } else {
          await test.step('A receiver without sats purchases the carrier paid in sender assets', async () => {
            const before = await ledger(parties, assetId)
            const known = await advances()
            await send(alice, request(dave.address, 'sender'), '1', 'Sender pays asset fare')
            await pay(alice)
            const [transfer] = await fresh(known)
            expect(await fresh(known)).toHaveLength(1)
            await expect(dave.page.getByRole('dialog').getByTestId(`asset-row-XYZ-${assetId}`)).toContainText('1 XYZ')
            await claim(dave, 'The sender paid for the carrier. You receive 330 sats with no sats needed.')
            await expect.poll(async () => (await status(transfer.id)).state, { timeout: 60_000 }).toBe('purchased')
            await conserved({
              ...before,
              alice: shift(before.alice, 0n, -2n),
              dave: shift(before.dave, 330n, 1n),
              taxi: shift(before.taxi, -330n, 1n),
            })
            await navigateHome(dave.page)
            await dave.page.getByTestId('activity-view-all').click()
            await dave.page
              .getByTestId('tx-row')
              .filter({
                has: dave.page.locator('.activity-row__meta', { hasText: /^Claimed · / }),
              })
              .click()
            await expect(dave.page.getByTestId('Transfer ID')).toContainText(transfer.id.slice(0, 11))
            await expect(dave.page.getByTestId('Carrier sats purchased')).toHaveText('330 sats')
            await expect(dave.page.getByTestId('Delivery')).toHaveText('Claimed')
          })
          await test.step('Sponsored assets arrive directly with their carrier and no claim', async () => {
            const before = await ledger(parties, assetId)
            const known = await advances()
            await send(alice, request(dave.address, 'sender'), '1', 'Sender sponsors carrier')
            await pay(alice)
            const transfers = await fresh(known)
            expect(transfers).toMatchObject([{ kind: 'sponsored', state: 'locked' }])
            const [transfer] = transfers
            await conserved({
              ...before,
              alice: shift(before.alice, 0n, -2n),
              dave: shift(before.dave, 330n, 1n),
              taxi: shift(before.taxi, -330n, 1n),
            })
            await expect(dave.page.getByText('Claim your Taxi delivery', { exact: true })).not.toBeVisible()
            await navigateHome(alice.page)
            await alice.page.getByTestId('activity-view-all').click()
            await alice.page
              .getByTestId('tx-row')
              .filter({
                has: alice.page.locator('.activity-row__meta', { hasText: /^Completed · / }),
              })
              .click()
            await expect(alice.page.getByTestId('Transfer ID')).toContainText(transfer.id.slice(0, 11))
            await expect(alice.page.getByTestId('Carrier sats purchased')).toHaveText('330 sats')
            await expect(alice.page.getByTestId('Delivery')).toHaveText('Completed')
          })
          await test.step('A paused service creates no payment and changes no balances', async () => {
            const before = await ledger(parties, assetId)
            const known: Advance[] = await advances()
            await admin('pause', 'POST', {})
            try {
              await send(alice, request(dave.address, 'sender'), '1', 'Sender pays asset fare')
              await expect(alice.page.getByText('Taxi is paused', { exact: false })).toBeVisible()
              expect(await fresh(known)).toEqual([])
              await conserved(before)
            } finally {
              await admin('resume', 'POST', {})
            }
          })
        }
        await testInfo.attach('Final financial balances', {
          body: JSON.stringify(await ledger(parties, assetId), null, 2),
          contentType: 'application/json',
        })
      } finally {
        await restorePolicy(policy)
        await Promise.all(contexts.map((context) => context.close()))
      }
    },
  )
}
