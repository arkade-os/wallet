import { execSync } from 'child_process'
import { SimplePool } from 'nostr-tools'
import { prettyNumber } from '../../lib/format'
import { translations } from '../../lib/i18n'
import { test, expect, createWallet, dismissPaymentSuccess, fundWallet, prePay } from './utils'

/** The regtest solver serves asset markets only. Pin a Bitcoin market and observe
 *  the wallet contacting it so the fallback tests exercise both methods. */
const tr = translations.en
const RFQ_KIND = 24859
const RELAY = 'ws://localhost:7777'
const UNREACHABLE_RELAY = 'wss://localhost:65534/'
/** On-curve and nobody's: an off-curve key fails at decompression, before any relay is dialled. */
const SOLVER = '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const RECIPIENT = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'
const FUNDED = 5000
const TOTAL = 2000
const FEE = 200

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
      // Base side off, as beta-solver.card.json has it: `rendezvousOf` bounds
      // against the QUOTE side, so a "0" here is disabled, not broken.
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

const fundedWalletOnDetails = async (page: Page, isMobile: boolean) => {
  await createWallet(page)
  await fundWallet(page, FUNDED)
  await prePay(page, RECIPIENT, isMobile, TOTAL)
  await expect(page.getByTestId('Rail')).toHaveText(tr.solvers.onchainMethodExit, { timeout: 60_000 })
  await expect(page.getByTestId('primary-amount')).toHaveText(`${prettyNumber(TOTAL - FEE)} sats`)
  await expect(page.getByTestId('Network fees')).toHaveText(`${FEE} sats`)
  await expect(page.getByTestId('Total')).toHaveText(`${prettyNumber(TOTAL)} sats`)
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
  test.beforeAll(() => execSync(`docker exec arkd arkd fees intent --onchain-output "${FEE}.0"`))
  test.afterAll(() => execSync('docker exec arkd arkd fees clear'))

  test('pays through the collaborative exit when the solver cannot be reached', async ({ page, isMobile }) => {
    test.setTimeout(180_000)
    await pinSolver(page, [UNREACHABLE_RELAY])
    await Promise.all([
      page.waitForEvent('websocket', {
        predicate: (socket) => socket.url() === UNREACHABLE_RELAY,
        timeout: 60_000,
      }),
      fundedWalletOnDetails(page, isMobile),
    ])

    await page.getByRole('button', { name: tr.send.tapToSign }).click()
    await dismissPaymentSuccess(page)
    await expect(page.getByText(`- ${prettyNumber(TOTAL)} sats`, { exact: true })).toBeVisible({ timeout: 30_000 })
  })

  test('pays through the collaborative exit when the solver never answers', async ({ page, isMobile }) => {
    test.setTimeout(180_000)
    await silentSolver(async (delivered) => {
      await pinSolver(page, ['ws://localhost:7777'])
      await fundedWalletOnDetails(page, isMobile)
      expect(delivered()).toBeGreaterThan(0)

      await page.getByRole('button', { name: tr.send.tapToSign }).click()
      await dismissPaymentSuccess(page)
      await expect(page.getByText(`- ${prettyNumber(TOTAL)} sats`, { exact: true })).toBeVisible({ timeout: 30_000 })
    })
  })

  test('shows an error and disables repeat signing when the chosen exit fails', async ({ page, isMobile }) => {
    test.setTimeout(180_000)
    await pinSolver(page, [UNREACHABLE_RELAY])
    await fundedWalletOnDetails(page, isMobile)

    const sign = page.getByRole('button', { name: tr.send.tapToSign })
    await page.context().setOffline(true)
    try {
      await sign.click()
      await expect(page.getByText(/Settlement failed/)).toBeVisible({ timeout: 120_000 })
      await expect(sign).toBeDisabled()
      await expect(page.getByTestId('loading-logo')).toHaveCount(0)
    } finally {
      await page.context().setOffline(false)
    }
  })

  test('completes the send the user walked away from, without hijacking the screen', async ({ page, isMobile }) => {
    test.setTimeout(180_000)
    await silentSolver(async () => {
      await pinSolver(page, ['ws://localhost:7777'])
      await fundedWalletOnDetails(page, isMobile)

      let unpause!: () => void
      const unpaused = new Promise<void>((resolve) => {
        unpause = resolve
      })
      await page.context().route('**/v1/batch/registerIntent', async (route) => {
        if (route.request().method() === 'POST') await unpaused
        await route.continue()
      })
      try {
        await page.getByRole('button', { name: tr.send.tapToSign }).click()
        await page.getByTestId('loading-logo').waitFor({ timeout: 10_000 })
        await page.goBack()
        await expect(page.getByTestId('input-amount-max')).toBeVisible({ timeout: 10_000 })
      } finally {
        unpause()
      }

      await expect(page.getByText(`${prettyNumber(FUNDED - TOTAL)} sats available`)).toBeVisible({ timeout: 120_000 })
      await expect(page.getByTestId('input-amount-max')).toBeVisible()
    })
  })
})
