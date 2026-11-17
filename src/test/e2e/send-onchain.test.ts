import { execSync } from 'child_process'
import { prettyNumber } from '../../lib/format'
import { test, expect, createWallet, fundWallet, prePay } from './utils'

const SOLVER = '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const RECIPIENT = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'
const RELAY = 'ws://localhost:7777'
const FUNDED = 5000
const SENT = 2000

const cardWithRelays = (relays: string[]) => ({
  version: 0,
  name: 'e2e-onchain-solver',
  discovery_pubkey: SOLVER,
  transports: { nostr: { relays } },
  markets: [
    {
      fee_bps: 10,
      min_base_amount: '0',
      max_base_amount: '0',
      min_quote_amount: '500',
      pair: 'BTC/onchain:BTC',
      quote_corridor: 'onchain',
      max_quote_amount: '1000000',
      base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
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
  await prePay(page, RECIPIENT, isMobile, SENT)
  await expect(page.getByTestId('Total')).toContainText(`${prettyNumber(SENT)} sats`)
}

test.describe('on-chain send with solver', () => {
  // An unset intent fee parses as NaN, which makes Tap to Sign a silent no-op.
  // test.beforeAll(() => execSync('docker exec arkd arkd fees intent --onchain-output "200.0"'))
  // test.afterAll(() => execSync('docker exec arkd arkd fees clear'))

  test('pays through the solver', async ({ page, isMobile }) => {
    await pinSolver(page, [RELAY])
    await fundedWalletOnDetails(page, isMobile)

    await page.getByText('Tap to Sign').click()
    await page.getByTestId('loading-logo').waitFor({ timeout: 10_000 })
    await page.waitForSelector('text=Payment sent', { timeout: 60_000 })

    await page.getByRole('button', { name: /Sounds good|Tap to go home/ }).click()
    await page.waitForSelector(`text=- ${prettyNumber(SENT)} sats`, { timeout: 30_000 })
  })
})
