import {
  devices,
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
  type TestInfo,
} from '@playwright/test'
import { enableAssets, mintAsset, navigateHome } from '../e2e/utils'
import {
  admin,
  confirmSend,
  control,
  faucetWallet,
  fund,
  holdings,
  importAsset,
  onboard,
  policyRulesForPatch,
  prepareSend,
  receiveRequest,
  required,
  taxiConfirmation,
  tr,
  xyzRule,
  type Actor,
  type TaxiPolicy,
} from './actors'

const PENDING = 'Payment may have been submitted; retry checks the same transfer'
// The live mutinynet payload of the stuck advance 3ccdf42c.
const FAILED = {
  state: 'locking',
  submissionPhase: 'failed',
  failureCode: 'lockup_submission_invalid_provider_response',
  failureDetail: 'server checkpoint 0 changed unsigned fields or metadata',
}

type Advance = { id: string; state: string }
type Scene = { alice: Actor; bob: Actor; assetId: string }

const sheet = (page: Page) => page.getByRole('dialog')
const advances = async () => (await admin<{ advances: Advance[] }>('advances')).advances

async function newAdvance(before: Advance[]): Promise<Advance> {
  const fresh = (await advances()).filter((advance) => !before.some((old) => old.id === advance.id))
  expect(fresh).toHaveLength(1)
  return fresh[0]
}

async function declineClaims(page: Page): Promise<void> {
  const notNow = sheet(page).getByRole('button', { name: 'Not now', exact: true })
  if (await notNow.isVisible().catch(() => false)) await notNow.click()
}

async function taxiRows(actor: Actor, state: string | RegExp) {
  await declineClaims(actor.page)
  await navigateHome(actor.page)
  await actor.page.getByTestId('activity-view-all').click()
  return actor.page.getByTestId('tx-row').filter({ hasText: typeof state === 'string' ? `Taxi · ${state}` : state })
}

async function openTaxiRow(actor: Actor, state: string | RegExp): Promise<void> {
  const row = await taxiRows(actor, state)
  await expect(row).toHaveCount(1)
  await row.click()
  await expect(actor.page.getByTestId('Transfer ID')).toBeVisible()
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
  const options = {
    ...device,
    baseURL: testInfo.project.use.baseURL,
    permissions: ['clipboard-read', 'clipboard-write'],
    locale: 'en-US',
    reducedMotion: 'reduce' as const,
  }
  const aliceContext = await browser.newContext(options)
  const bobContext = await browser.newContext(options)
  const faucet = await faucetWallet()
  const policy = await admin<TaxiPolicy>('policy')
  const rules = policyRulesForPatch(policy.assetRules)
  try {
    const alice = await onboard('Alice', await aliceContext.newPage())
    const bob = await onboard('Bob', await bobContext.newPage())
    await fund(faucet, alice, 20_000)
    await fund(faucet, bob, 1_000)
    await enableAssets(alice.page)
    await mintAsset(alice.page, { amount: '20', name: 'Taxi History XYZ', ticker: 'XYZ', decimals: 0 })
    const rowId = await alice.page.getByTestId(/^asset-row-XYZ-/).getAttribute('data-testid')
    const assetId = rowId!.slice('asset-row-XYZ-'.length)
    await admin('policy', 'PATCH', { assetRules: [...rules, xyzRule(assetId)] })
    await importAsset(bob, assetId)
    await play({ alice, bob, assetId })
  } finally {
    for (const cleanup of [
      () => control('reset'),
      () => admin('policy', 'PATCH', { assetRules: rules, quoteTtlSeconds: policy.quoteTtlSeconds }),
      () => faucet.dispose(),
      () => aliceContext.close(),
      () => bobContext.close(),
    ])
      await cleanup().catch(() => undefined)
  }
}

async function claimFromActivity(bob: Actor): Promise<void> {
  const delivery = await taxiRows(bob, 'Claimable')
  await expect(delivery).toHaveCount(1)
  await delivery.click()
  const sheetOpen = await sheet(bob.page)
    .isVisible()
    .catch(() => false)
  if (!sheetOpen) await bob.page.getByRole('button', { name: 'Claim', exact: true }).click()
  await sheet(bob.page).getByRole('button', { name: 'Claim', exact: true }).click()
  await expect(sheet(bob.page)).not.toBeVisible()
  const success = bob.page.getByRole('button', { name: /Sounds good|Tap to go home/ })
  if (await success.isVisible().catch(() => false)) await success.click()
}

async function claimedFromActivity({ alice, bob, assetId }: Scene): Promise<void> {
  const request = await receiveRequest(bob, assetId)
  const before = await advances()
  await prepareSend(alice, request, 'Receiver uses own sats')
  await confirmSend(alice, true)
  const advance = await newAdvance(before)

  await openTaxiRow(alice, /Taxi · (Awaiting claim|Claimed)/)
  await expect(alice.page.getByTestId('Transfer ID')).toContainText(advance.id.slice(0, 11))
  await expect(alice.page.getByTestId('Carrier mode')).toHaveText('Receiver uses own sats')
  await expect(alice.page.getByTestId('Taxi service fee')).toHaveText('0 sats')

  await expect(sheet(bob.page).getByText('Claim your Taxi delivery', { exact: true })).toBeVisible()
  const delivery = await taxiRows(bob, 'Claimable')
  await expect(delivery).toContainText(/Taxi delivery|Received/)
  await expect(delivery).toContainText('1 XYZ')
  await claimFromActivity(bob)
  const claimed = await taxiRows(bob, 'Claimed')
  await expect(claimed).toHaveCount(1)
  await expect(claimed).toContainText('Received')
  await expect(claimed).not.toContainText('Sent')

  await openTaxiRow(alice, /Taxi · (Awaiting claim|Claimed)/)
  if (await alice.page.getByRole('button', { name: 'Check again', exact: true }).isVisible()) await checkAgain(alice)
  await expect(alice.page.getByTestId('Delivery')).toHaveText('Claimed')
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

test('Taxi transfers in activity: every state, and the action each offers', async ({ browser }, testInfo) => {
  await scene(browser, testInfo, {}, async (s) => {
    const { alice, bob, assetId } = s
    let stranded = ''

    await test.step('a recycled send reads Awaiting claim; Bob claims it from his activity and it reads Received', () =>
      claimedFromActivity(s))

    await test.step('a payment whose answer was lost survives a reload as Pending, and Check again confirms it', async () => {
      const request = await receiveRequest(bob, assetId)
      const before = await advances()
      await prepareSend(alice, request, 'Sender pays asset fare')
      await taxiConfirmation(alice)
      stranded = (await newAdvance(before)).id
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
      const status = `**/v1/transfers/${stranded}`
      await alice.page.route(status, (route) => route.abort())
      await alice.page.reload()
      await expect(alice.page.getByTestId('home-action-receive')).toBeVisible()
      await openTaxiRow(alice, 'Pending')
      await expect(alice.page.getByText(/may have been submitted/)).toBeVisible()
      await alice.page.unroute(status)
      await checkAgain(alice)
      await expect(alice.page.getByTestId('Delivery')).toHaveText('Awaiting claim')
      await expect(await taxiRows(alice, 'Awaiting claim')).toHaveCount(1)
      await expect.poll(() => journaled(alice)).toBe(false)
    })

    await test.step('an unreachable Taxi blanks nothing: rows keep their last state and Check again says so', () =>
      unreachableTaxi(s, 'Awaiting claim'))

    await test.step('a payment the Taxi gave back reads Returned', async () => {
      const real = await (await fetch(`${required('TAXI_E2E_BASE_URL')}/v1/transfers/${stranded}`)).json()
      const status = `**/v1/transfers/${stranded}`
      await alice.page.route(status, (route) =>
        route.fulfill({
          json: { ...real, state: 'recovered', spentTxid: 'f'.repeat(64), updatedAt: real.updatedAt + 1 },
        }),
      )
      try {
        await openTaxiRow(alice, 'Awaiting claim')
        await checkAgain(alice)
        await expect(alice.page.getByTestId('Delivery')).toHaveText('Returned')
        await expect(alice.page.getByText('The Taxi returned this payment to you.', { exact: true })).toBeVisible()
      } finally {
        await alice.page.unroute(status)
      }
      await claimFromActivity(bob)
    })

    await test.step('a lockup that never reached the Taxi: Failed while the Taxi says so, never resumed, Not sent once expired', async () => {
      await admin('policy', 'PATCH', { quoteTtlSeconds: 20 })
      const request = await receiveRequest(bob, assetId)
      const held = await holdings(alice.address, assetId)
      const before = await advances()
      await prepareSend(alice, request, 'Receiver uses own sats')
      await taxiConfirmation(alice)
      const advance = await newAdvance(before)
      const lockup = `**/v1/transfers/${advance.id}/lockup`
      const status = `**/v1/transfers/${advance.id}`
      await alice.page.route(lockup, (route) => route.abort())
      await alice.page.route(status, (route) =>
        route.fulfill({ json: { transferId: advance.id, updatedAt: Math.floor(Date.now() / 1000), ...FAILED } }),
      )
      await alice.page.getByRole('button', { name: 'Pay', exact: true }).click()
      await expect(alice.page.getByText(PENDING, { exact: true })).toBeVisible()
      await openTaxiRow(alice, 'Pending')
      await checkAgain(alice)
      await expect(alice.page.getByTestId('Delivery')).toHaveText('Failed')
      await expect(alice.page.getByText(FAILED.failureDetail, { exact: true })).toBeVisible()
      await expect(alice.page.getByText(`Error code: ${FAILED.failureCode}`, { exact: true })).toBeVisible()
      await expectSendBlocked(alice)

      await alice.page.unroute(status)
      await alice.page.unroute(lockup)
      await expect
        .poll(async () => (await advances()).find((other) => other.id === advance.id)?.state, { timeout: 120_000 })
        .toBe('expired')
      await openTaxiRow(alice, 'Failed')
      await checkAgain(alice)
      await expect(alice.page.getByTestId('Delivery')).toHaveText('Not sent')
      await expect(alice.page.getByTestId('error-message')).not.toBeVisible()
      await expect.poll(() => journaled(alice)).toBe(false)
      expect(await holdings(alice.address, assetId)).toEqual(held)
    })
  })
})

test('Taxi transfers in activity on a phone', async ({ browser }, testInfo) => {
  await scene(browser, testInfo, devices['Pixel 7'], async (s) => {
    await test.step('a recycled send, claimed from activity', () => claimedFromActivity(s))
    await test.step('an unreachable Taxi blanks nothing', () => unreachableTaxi(s))
  })
})
