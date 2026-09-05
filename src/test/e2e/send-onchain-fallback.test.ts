import { execSync } from 'child_process'
import { SimplePool } from 'nostr-tools'
import { prettyNumber } from '../../lib/format'
import { test, expect, createWallet, fundWallet, prePay } from './utils'

/**
 * The regtest solver serves asset markets only, so a send there never reaches
 * the solver rail — "falls back to the exit" would pass with the rail deleted.
 * Every test pins a card that really advertises `arkade:BTC -> onchain:BTC` and
 * asserts the refusal it provoked: two failing alike would be one test twice.
 */
const RFQ_KIND = 24859
const RELAY = 'ws://localhost:10547'
/** On-curve and nobody's: an off-curve key fails at decompression, before any relay is dialled. */
const SOLVER = '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const RECIPIENT = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'
const FUNDED = 5000
const SENT = 2000

const cardWithRelays = (relays: string[]) => ({
  version: 0,
  name: 'e2e-onchain-solver',
  discovery_pubkey: SOLVER,
  transports: { nostr: { relays } },
  markets: [
    {
      pair: 'BTC/onchain:BTC',
      base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_corridor: 'onchain',
      fee_bps: 10,
      min_base_amount: '0',
      max_base_amount: '0',
      min_quote_amount: '500',
      max_quote_amount: '1000000',
    },
  ],
})

type Page = Parameters<typeof createWallet>[0]

const pinSolver = (page: Page, relays: string[]) =>
  page.addInitScript((card) => {
    localStorage.setItem('solverCards', JSON.stringify([{ network: 'regtest', label: 'e2e-onchain', card }]))
  }, cardWithRelays(relays))

const routeLog = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    (JSON.parse(localStorage.getItem('logs') ?? '[]') as { msg: string }[])
      .map((l) => l.msg)
      .filter((m) => m.startsWith('onchain send:')),
  )

const expectRoute = async (page: Page, refusal: RegExp) => {
  const log = await routeLog(page)
  expect(log.find((m) => m.includes('solver-onchain could not quote'))).toMatch(refusal)
  expect(log.some((m) => m.includes('paying via onchain'))).toBe(true)
}

const fundedWalletOnDetails = async (page: Page, isMobile: boolean) => {
  await createWallet(page)
  await fundWallet(page, FUNDED)
  await prePay(page, RECIPIENT, isMobile, SENT)
  await expect(page.getByTestId('Total')).toContainText(`${prettyNumber(SENT)} sats`)
}

/** Subscribe as the solver would, answer nothing. Without a listener `nak serve`
 *  refuses the ephemeral RFQ ("mute: no one was listening for this"), turning
 *  the timeout case back into the socket one; the count proves delivery. */
const silentSolver = async (run: (delivered: () => number) => Promise<void>) => {
  const pool = new SimplePool()
  let seen = 0
  const sub = pool.subscribe(
    [RELAY],
    { kinds: [RFQ_KIND], '#p': [SOLVER] },
    {
      onevent: () => {
        seen++
      },
    },
  )
  try {
    await run(() => seen)
  } finally {
    sub.close()
    pool.close([RELAY])
  }
}

test.describe('on-chain send when the solver rail fails', () => {
  // An unset intent fee parses as NaN, which makes Tap to Sign a silent no-op.
  test.beforeAll(() => execSync('docker exec -t arkd arkd fees intent --onchain-output "200.0"'))
  test.afterAll(() => execSync('docker exec -t arkd arkd fees clear'))

  test('pays through the collaborative exit when the solver cannot be reached', async ({ page, isMobile }) => {
    await pinSolver(page, ['wss://localhost:9'])
    await fundedWalletOnDetails(page, isMobile)

    await page.getByText('Tap to Sign').click()
    await page.getByTestId('loading-logo').waitFor({ timeout: 10_000 })
    await page.waitForSelector('text=Payment sent', { timeout: 60_000 })

    await expectRoute(page, /no relay accepted/)
    await page.getByRole('button', { name: /Sounds good|Tap to go home/ }).click()
    await page.waitForSelector(`text=- ${prettyNumber(SENT)} sats`, { timeout: 15_000 })
  })

  test('pays through the collaborative exit when the solver never answers', async ({ page, isMobile }) => {
    test.setTimeout(180_000)
    await silentSolver(async (delivered) => {
      await pinSolver(page, ['wss://localhost:10548'])
      await fundedWalletOnDetails(page, isMobile)

      await page.getByText('Tap to Sign').click()
      await page.getByTestId('loading-logo').waitFor({ timeout: 10_000 })
      // Bounded, not indefinite: the RFQ gives up on its own and the exit pays.
      await page.waitForSelector('text=Payment sent', { timeout: 120_000 })

      expect(delivered()).toBeGreaterThan(0)
      await expectRoute(page, /not responding/)
      await page.getByRole('button', { name: /Sounds good|Tap to go home/ }).click()
      await page.waitForSelector(`text=- ${prettyNumber(SENT)} sats`, { timeout: 15_000 })
    })
  })

  test('names the failure and offers the retry when the exit fails too', async ({ page, isMobile }) => {
    test.setTimeout(180_000)
    await pinSolver(page, ['wss://localhost:9'])
    await fundedWalletOnDetails(page, isMobile)

    // Offline fails both rails; the spinner must not be where the user is left.
    await page.context().setOffline(true)
    await page.getByText('Tap to Sign').click()

    await expect(page.getByText(/Settlement failed/)).toBeVisible({ timeout: 120_000 })
    await expect(page.getByText('Tap to Sign')).toBeVisible()
    await expect(page.getByTestId('loading-logo')).toHaveCount(0)
    await page.context().setOffline(false)
  })

  test('completes the send the user walked away from, without hijacking the screen', async ({ page, isMobile }) => {
    test.setTimeout(180_000)
    await silentSolver(async () => {
      await pinSolver(page, ['wss://localhost:10548'])
      await fundedWalletOnDetails(page, isMobile)

      await page.getByText('Tap to Sign').click()
      await page.getByTestId('loading-logo').waitFor({ timeout: 10_000 })
      // #946's window, held open by the RFQ timeout. Funding is committed either
      // way, so the balance must land; a success screen pushed over whatever the
      // user opened next would be a hijack.
      await page.goBack()
      await expect(page.getByTestId('input-amount-max')).toBeVisible({ timeout: 10_000 })

      await expect(page.getByText(`${prettyNumber(FUNDED - SENT)} sats available`)).toBeVisible({ timeout: 120_000 })
      await expect(page.getByTestId('input-amount-max')).toBeVisible()
    })
  })
})
