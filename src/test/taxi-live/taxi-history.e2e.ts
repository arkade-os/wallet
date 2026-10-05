import { devices, expect, test, type Browser, type BrowserContextOptions, type TestInfo } from '@playwright/test'
import { navigateHome, resetWallet, waitForWalletPage } from '../e2e/utils'
import {
  admin,
  advances,
  claimFromActivity,
  confirmSend,
  control,
  expectLedger,
  expectStateShown,
  holdings,
  ledger,
  importAsset,
  mintXyz,
  newAdvance,
  operatorAddress,
  openTaxiRow,
  prepareSend,
  policyRulesForPatch,
  receiveRequest,
  required,
  sheet,
  shift,
  stage,
  taxiStatus,
  taxiConfirmation,
  taxiRows,
  tr,
  xyzRule,
  type Actor,
  type Ledger,
  type TaxiPolicy,
} from './actors'

const PENDING = 'Payment may have been submitted; retry checks the same transfer'
type Scene = { alice: Actor; bob: Actor; assetId: string }

const checkAgainIfOffered = async (actor: Actor) => {
  const check = actor.page.getByRole('button', { name: 'Check again', exact: true })
  if (await check.isVisible()) await check.click()
}

const checkAgain = (actor: Actor) => actor.page.getByRole('button', { name: 'Check again', exact: true }).click()

async function expectSendBlocked(alice: Actor): Promise<void> {
  await navigateHome(alice.page)
  await alice.page.getByText(tr.wallet.send, { exact: true }).click()
  await expect(alice.page.getByRole('button', { name: 'Check Taxi payment', exact: true })).toBeVisible()
  await navigateHome(alice.page)
}

const journaled = (alice: Actor) =>
  alice.page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('directTaxiPending:')))

async function scene(
  browser: Browser,
  testInfo: TestInfo,
  device: BrowserContextOptions,
  play: (s: Scene) => Promise<void>,
) {
  await stage(browser, testInfo, async ({ join, evidence }) => {
    const alice = await join('Alice', { device, sats: 20_000 })
    const bob = await join('Bob', { device, sats: 1_000 })
    const assetId = await mintXyz(alice)
    evidence.assetId = assetId
    const policy = await admin<TaxiPolicy>('policy')
    await admin('policy', 'PATCH', { assetRules: [...policyRulesForPatch(policy.assetRules), xyzRule(assetId)] })
    await importAsset(bob, assetId)
    await play({ alice, bob, assetId })
  })
}

async function claimedFromActivity({ alice, bob, assetId }: Scene): Promise<void> {
  const parties = { alice: alice.address, bob: bob.address, taxi: operatorAddress() }
  const balances = await ledger(parties, assetId)
  const request = await receiveRequest(bob, assetId)
  const before = await advances()
  await prepareSend(alice, request, 'Receiver uses own sats')
  await confirmSend(alice, true)
  const advance = await newAdvance(before)
  const locked = await taxiStatus(advance.id)
  expect(locked.state).toBe('locked')
  expect(locked.outpoint).toBeDefined()
  const copyTransaction = async (txid: string) => {
    const row = alice.page
      .locator('[data-testid="Transaction ID"], [data-testid^="Related transaction"]')
      .filter({ hasText: txid.slice(0, 8) })
    await expect(row).toHaveCount(1)
    await row.click()
    await expect.poll(() => alice.page.evaluate(() => navigator.clipboard.readText())).toBe(txid)
  }

  await openTaxiRow(alice, /Awaiting claim|Claimed/)
  await expect(alice.page.getByTestId('Transfer ID')).toContainText(advance.id.slice(0, 11))
  await expect(alice.page.getByTestId('Carrier mode')).toHaveText('Receiver uses own sats')
  await expect(alice.page.getByTestId('Taxi service fee')).toHaveText('0 sats')
  await expect(alice.page.getByTestId('Carrier sats')).toHaveText('Borrowed 330 sats')
  await copyTransaction(locked.outpoint!.txid)

  await expect(sheet(bob.page).getByText('Claim your Taxi delivery', { exact: true })).toBeVisible()
  const delivery = await taxiRows(bob, 'Claimable')
  await expect(delivery).toContainText(/Taxi delivery|Received/)
  await expect(delivery).toContainText('1 XYZ')
  await claimFromActivity(bob)
  const claimed = await taxiRows(bob, 'Claimed')
  await expect(claimed).toHaveCount(1)
  await expect(claimed).toContainText('Received')
  await expect(claimed).not.toContainText('Sent')
  await expectStateShown(claimed)
  await openTaxiRow(bob, 'Claimed')
  await expect(bob.page.getByTestId('Carrier sats')).toHaveText('Borrowed 330 sats')
  await expect(bob.page.getByTestId('Delivery')).toHaveText('Claimed')

  await openTaxiRow(alice, /Awaiting claim|Claimed/)
  await checkAgainIfOffered(alice)
  await expect(alice.page.getByTestId('Delivery')).toHaveText('Claimed')
  await expect.poll(async () => (await taxiStatus(advance.id)).state).toBe('recycled')
  const claimedStatus = await taxiStatus(advance.id)
  expect(claimedStatus.spentTxid).toMatch(/^[0-9a-f]{64}$/)
  for (const txid of [locked.outpoint!.txid, claimedStatus.spentTxid!]) await copyTransaction(txid)
  await expectLedger(parties, assetId, {
    alice: shift(balances.alice, 0n, -1n),
    bob: shift(balances.bob, 0n, 1n),
    taxi: balances.taxi,
  })
}

async function unreachableTaxi({ alice }: Scene, open?: string): Promise<void> {
  const taxi = `${new URL(required('TAXI_E2E_BASE_URL')).origin}/**`
  await alice.page.route(taxi, (route) => route.abort())
  try {
    await alice.page.reload()
    await expect(alice.page.getByTestId('home-action-receive')).toBeVisible()
    await expect(await taxiRows(alice, 'Claimed')).toHaveCount(1)
    if (!open) return
    await openTaxiRow(alice, open)
    await checkAgain(alice)
    await expect(alice.page.getByTestId('error-message')).toContainText(/reach the Taxi/)
  } finally {
    await alice.page.unroute(taxi)
  }
}

test('Taxi activity and its available actions', { tag: '@history' }, async ({ browser }, testInfo) => {
  await scene(browser, testInfo, {}, async (s) => {
    const { alice, bob, assetId } = s
    const parties = { alice: alice.address, bob: bob.address, taxi: operatorAddress() }
    let beforePurchase: Ledger
    let stranded = ''

    await test.step('a recycled send reads Awaiting claim; Bob claims it from his activity and it reads Received', () =>
      claimedFromActivity(s))

    await test.step('a payment whose answer was lost survives a reload as Pending, and Check again confirms it', async () => {
      const request = await receiveRequest(bob, assetId, null, '1', 'sender')
      beforePurchase = await ledger(parties, assetId)
      const before = await advances()
      await prepareSend(alice, request, 'Sender pays asset fare')
      await taxiConfirmation(alice)
      stranded = (await newAdvance(before)).id
      // Before Pay: the Taxi takes the lockup whose answer is dropped, so a poll before the reload could read it locked.
      const status = `**/v1/transfers/${stranded}`
      await alice.page.route(status, (route) => route.abort())
      await control('configure', {
        target: 'taxi',
        path: `/v1/transfers/${stranded}/lockup`,
        method: 'POST',
        mode: 'drop',
        once: false,
      })
      await alice.page.getByRole('button', { name: 'Pay', exact: true }).click()
      await expect(alice.page.getByText(PENDING, { exact: true })).toBeVisible()
      await control('reset')
      await alice.page.reload()
      await expect(alice.page.getByTestId('home-action-receive')).toBeVisible()
      await openTaxiRow(alice, 'Pending')
      await expect(alice.page.getByText(/may have been submitted/)).toBeVisible()
      await alice.page.unroute(status)
      await checkAgain(alice)
      await expect(alice.page.getByTestId('Delivery')).toHaveText('Awaiting claim')
      await expect(alice.page.getByTestId('Carrier sats purchased')).toHaveText('330 sats')
      await expect(alice.page.getByTestId('Taxi service fee')).toHaveText('1 XYZ')
      await expect(await taxiRows(alice, 'Awaiting claim')).toHaveCount(1)
      await expect.poll(() => journaled(alice)).toBe(false)
    })

    await test.step('an unreachable Taxi blanks nothing: rows keep their last state and Check again says so', () =>
      unreachableTaxi(s, 'Awaiting claim'))

    await test.step('a purchased carrier is claimed from the receiver activity with matching balances', async () => {
      await openTaxiRow(bob, 'Claimable')
      await expect(bob.page.getByTestId('Carrier sats purchased')).toHaveText('330 sats')
      await expect(bob.page.getByTestId('Delivery')).toHaveText('Claimable')
      await claimFromActivity(bob)
      await expect.poll(async () => (await taxiStatus(stranded)).state).toBe('purchased')
      await expectLedger(parties, assetId, {
        alice: shift(beforePurchase.alice, 0n, -2n),
        bob: shift(beforePurchase.bob, 330n, 1n),
        taxi: shift(beforePurchase.taxi, -330n, 1n),
      })
      await expect(await taxiRows(bob, 'Claimed')).toHaveCount(2)
    })

    await test.step('a lockup that never reached the Taxi expires and reads Not sent without debiting Alice', async () => {
      await admin('policy', 'PATCH', { quoteTtlSeconds: 20 })
      const request = await receiveRequest(bob, assetId)
      const held = await holdings(alice.address, assetId)
      const before = await advances()
      await prepareSend(alice, request, 'Receiver uses own sats')
      await taxiConfirmation(alice)
      const advance = await newAdvance(before)
      const lockup = `**/v1/transfers/${advance.id}/lockup`
      await alice.page.route(lockup, (route) => route.abort())
      await alice.page.getByRole('button', { name: 'Pay', exact: true }).click()
      await expect(alice.page.getByText(PENDING, { exact: true })).toBeVisible()
      await expectSendBlocked(alice)
      await alice.page.unroute(lockup)
      await expect
        .poll(async () => (await advances()).find((other) => other.id === advance.id)?.state, { timeout: 120_000 })
        .toBe('expired')
      await openTaxiRow(alice, /Pending|Not sent/)
      await checkAgain(alice)
      await expect(alice.page.getByTestId('Delivery')).toHaveText('Not sent')
      await expect(alice.page.getByTestId('error-message')).not.toBeVisible()
      await expect.poll(() => journaled(alice)).toBe(false)
      expect(await holdings(alice.address, assetId)).toEqual(held)
    })

    await test.step('a send that supplies its own sats carries no Taxi label', async () => {
      await prepareSend(alice, await receiveRequest(bob, assetId))
      await confirmSend(alice, false)
      await navigateHome(alice.page)
      await alice.page.getByTestId('activity-view-all').click()
      const newest = alice.page.getByTestId('tx-row').first()
      await expect(newest).not.toContainText('Taxi')
      await expect(newest).toContainText('Sent')
    })

    await test.step('a reset wallet keeps none of the Taxi records', async () => {
      await resetWallet(alice.page)
      const create = alice.page.getByText(`+ ${tr.init.createWallet}`, { exact: true })
      await expect(create).toBeVisible()
      expect(await alice.page.evaluate(() => localStorage.getItem('taxiActivity'))).toBeNull()
      await create.click()
      await waitForWalletPage(alice.page)
      await expect(alice.page.getByText(tr.common.noTransactionsYet, { exact: true })).toBeVisible()
    })
  })
})

test('Taxi transfers in activity on a phone', { tag: '@history' }, async ({ browser }, testInfo) => {
  await scene(browser, testInfo, devices['Pixel 7'], async (s) => {
    await test.step('a recycled send, claimed from activity', () => claimedFromActivity(s))
    await test.step('an unreachable Taxi blanks nothing', () => unreachableTaxi(s))
  })
})
