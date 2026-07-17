import { Page } from '@playwright/test'
import { sleep } from '../../lib/sleep'
import {
  test,
  expect,
  createWallet,
  pay,
  receiveLightning,
  waitForPaymentReceived,
  fundWallet,
  navigateHome,
  navigateToBoltz,
  addInvoiceFromLND,
  getInvoiceFromLND,
} from './utils'
import { prettyLongText } from '../../lib/format'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/** Open the Boltz app on a successful swap's detail page. */
async function openBoltzSwap(page: Page, direction: string, amountText?: string): Promise<void> {
  await navigateToBoltz(page)
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('Successful')).toBeVisible()
  if (amountText) await page.waitForSelector(`text=${amountText}`, { timeout: 10000 })
  await page.getByText(direction).click()
}

/** Assert the swap detail page: the label rows are visible, the testId values exact. */
async function expectSwapDetails(page: Page, extraLabels: string[], values: Record<string, string>): Promise<void> {
  const labels = ['When', 'Kind', 'Swap ID', 'Direction', 'Date', 'Status', 'Amount', 'Fees', 'Total', ...extraLabels]
  for (const label of labels) {
    await expect(page.getByText(label, { exact: label === 'Invoice' })).toBeVisible()
  }
  for (const [testId, value] of Object.entries(values)) {
    expect(await page.getByTestId(testId).textContent()).toBe(value)
  }
}

test('should be connected to Boltz app', async ({ page }) => {
  await createWallet(page)
  await navigateToBoltz(page)
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('Connection status')).toBeVisible()
  await expect(page.getByText('http://localhost:')).toBeVisible()
  await expect(page.getByTestId('green-status-icon')).toBeVisible()
  await expect(page.getByText('No swaps yet')).toBeVisible()
})

test('should receive funds from Lightning', async ({ page, isMobile }) => {
  await createWallet(page)

  // get invoice and pay it from LND
  const invoice = await receiveLightning(page, isMobile, 2000)
  expect(invoice).toContain('lnbcrt')
  await execAsync(`docker exec lnd lncli --network=regtest payinvoice ${invoice} --force`)

  // wait for payment received
  await waitForPaymentReceived(page)

  // main page
  await navigateHome(page)
  await page.waitForSelector('text=Received', { timeout: 10000 })
  await expect(page.getByText('+ 1,992 sats')).toBeVisible()

  // swap page should show correct details
  await openBoltzSwap(page, 'Lightning to Arkade', '+ 1,992')
  await expectSwapDetails(page, ['Preimage', 'Invoice'], {
    Kind: 'Reverse Swap',
    Direction: 'Lightning to Arkade',
    Status: 'invoice.settled',
    Amount: '1,992 sats',
    Fees: '8 sats',
    Total: '2,000 sats',
  })
})

test('should raise error when trying to pay invoice with little amount', async ({ page }) => {
  await createWallet(page)

  const invoice = await getInvoiceFromLND(21)
  expect(invoice).toContain('lnbcrt')

  // go to send page and fill invoice
  await navigateHome(page)
  await page.getByText('Send').click()
  await page.locator('input[name="send-address"]').fill(invoice)
  await page.waitForSelector('text=Invoice amount below min of 1,000 sats', { state: 'visible' })
})

test('should send funds to Lightning', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page, 5000)

  const invoice = await getInvoiceFromLND(1000)
  expect(invoice).toContain('lnbcrt')

  // pay invoice
  await pay(page, invoice)

  // swap page should show correct details
  await openBoltzSwap(page, 'Arkade to Lightning', '- 1,001')
  await expectSwapDetails(page, ['Invoice'], {
    Kind: 'Submarine Swap',
    Direction: 'Arkade to Lightning',
    Status: 'transaction.claimed',
    Amount: '1,000 sats',
    Fees: '1 sat',
    Total: '1,001 sats',
  })

  // go back, await for swap to settle and preimage to be visible
  await page.getByLabel('Go back').click()
  await sleep(3000) // wait for swap to settle
  await page.getByText('Arkade to Lightning').click()
  await expect(page.getByText('Preimage')).toBeVisible()
})

test('should send funds to Bitcoin', async ({ page, isMobile }) => {
  await createWallet(page)
  await fundWallet(page, 5000)

  const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'
  await pay(page, someOnchainAddress, isMobile, 2000)

  // swap page should show correct details
  await openBoltzSwap(page, 'Arkade to Bitcoin')
  await expectSwapDetails(page, [], {
    Kind: 'Chain Swap',
    Direction: 'Arkade to BTC',
    'BTC Address': prettyLongText(someOnchainAddress),
    Status: 'transaction.claimed',
  })

  // The exact sat split depends on the onchain claim fee, which differs between
  // Boltz releases: the arkade-regtest stack runs boltz/boltz:latest at a
  // realistic 1 sat/vB, whereas nigiri's pinned Boltz produced a different fee
  // (which is where the old 2,111 / 164 / 2,275 constants came from). Assert the
  // amounts are present and internally consistent (Amount + Fees === Total)
  // rather than pinning environment-specific sat values.
  const toSats = (s: string | null) => Number((s ?? '').replace(/[^0-9]/g, ''))
  const amount = toSats(await page.getByTestId('Amount').textContent())
  const fees = toSats(await page.getByTestId('Fees').textContent())
  const total = toSats(await page.getByTestId('Total').textContent())
  expect(amount).toBeGreaterThan(0)
  expect(fees).toBeGreaterThan(0)
  expect(total).toEqual(amount + fees)
})

test('should refund failing swap', async ({ page }) => {
  test.setTimeout(60000)
  await createWallet(page)
  await fundWallet(page, 5000)

  const { invoice, hash } = await addInvoiceFromLND(1000)
  expect(invoice).toContain('lnbcrt')

  // cancel invoice to make the swap fail
  exec(`docker exec lnd lncli --network=regtest cancelinvoice ${hash}`)

  // try to send funds to Lightning
  await page.getByText('Send').click()
  await page.locator('input[name="send-address"]').fill(invoice)
  await page.getByText('Continue').click()
  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  // optimistic send: lands on the success screen once the swap is funded,
  // then the failure surfaces there when the swap fails in the background
  await page.waitForSelector('text=Payment failed', { timeout: 30000 })
  await page.getByText('Sounds good').click()

  // should be visible in Boltz app
  await navigateToBoltz(page)
  await expect(page.getByText('Boltz')).toBeVisible()
  await page.waitForSelector('text=Refunded', { timeout: 10000 })
  await expect(page.getByText('- 1,001')).toBeVisible()
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
})
