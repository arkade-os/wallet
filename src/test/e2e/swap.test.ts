import { test, expect, createWallet, pay, receiveLightning, waitForPaymentReceived, fundWallet } from './utils'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

test('should be connected to Boltz app', async ({ page }) => {
  await createWallet(page)

  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('Connection status')).toBeVisible()
  await expect(page.getByText('http://localhost:')).toBeVisible()
  await expect(page.getByTestId('green-status-icon')).toBeVisible()
  await expect(page.getByText('No swaps yet')).toBeVisible()
})

test('should receive funds from Lightning', async ({ page, isMobile }) => {
  await createWallet(page)

  // get invoice
  const invoice = await receiveLightning(page, isMobile, 2000)
  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // pay invoice
  await execAsync(`docker exec lnd lncli --network=regtest payinvoice ${invoice} --force`)

  // wait for payment received
  await waitForPaymentReceived(page)

  // main page
  await page.getByTestId('tab-wallet').click()
  await page.waitForSelector('text=Received', { timeout: 10000 })
  await expect(page.getByText('1,992', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 1,992 SATS')).toBeVisible()

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('Successful')).toBeVisible()
  await expect(page.getByText('+ 1,992')).toBeVisible()
  await expect(page.getByText('Lightning to Arkade')).toBeVisible()

  // swap page should show correct details
  await page.getByText('Lightning to Arkade').click()
  await expect(page.getByText('When')).toBeVisible()
  await expect(page.getByText('Kind')).toBeVisible()
  await expect(page.getByText('Swap ID')).toBeVisible()
  await expect(page.getByText('Direction')).toBeVisible()
  await expect(page.getByText('Date')).toBeVisible()
  await expect(page.getByText('Preimage')).toBeVisible()
  await expect(page.getByText('Invoice', { exact: true })).toBeVisible()
  await expect(page.getByText('Status')).toBeVisible()
  await expect(page.getByText('Amount')).toBeVisible()
  await expect(page.getByText('Fees')).toBeVisible()
  await expect(page.getByText('Total')).toBeVisible()

  expect(await page.getByTestId('Kind').textContent()).toBe('Reverse Swap')
  expect(await page.getByTestId('Direction').textContent()).toBe('Lightning to Arkade')
  expect(await page.getByTestId('Status').textContent()).toBe('invoice.settled')
  expect(await page.getByTestId('Amount').textContent()).toBe('1,992 SATS')
  expect(await page.getByTestId('Fees').textContent()).toBe('8 SATS')
  expect(await page.getByTestId('Total').textContent()).toBe('2,000 SATS')
})

test('should raise error when trying to pay invoice with little amount', async ({ page }) => {
  await createWallet(page)

  const { stdout } = await execAsync(`docker exec lnd lncli --network=regtest addinvoice --amt 21`)
  const outputJSON = JSON.parse(stdout.trim())
  const invoice = outputJSON.payment_request
  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // go to send page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()

  // fill invoice
  await page.locator('ion-input[name="send-address"] input').fill(invoice)
  await page.waitForSelector('text=Invoice amount below min of 1,000 sats', { state: 'visible' })
})

test('should send funds to Lightning', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page, 5000)

  const { stdout } = await execAsync(`docker exec lnd lncli --network=regtest addinvoice --amt 1000`)
  const output = stdout.trim()
  expect(output).toBeDefined()
  expect(output).toBeTruthy()
  const outputJSON = JSON.parse(output)
  expect('payment_request' in outputJSON).toBeTruthy()
  const invoice = outputJSON.payment_request
  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // pay invoice
  await pay(page, invoice)

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('Successful')).toBeVisible()
  await page.waitForSelector('text=- 1,001', { timeout: 10000 })
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()

  // swap page should show correct details
  await page.getByText('Arkade to Lightning').click()
  await expect(page.getByText('When')).toBeVisible()
  await expect(page.getByText('Kind')).toBeVisible()
  await expect(page.getByText('Swap ID')).toBeVisible()
  await expect(page.getByText('Direction')).toBeVisible()
  await expect(page.getByText('Date')).toBeVisible()
  await expect(page.getByText('Preimage')).toBeVisible()
  await expect(page.getByText('Invoice')).toBeVisible()
  await expect(page.getByText('Status')).toBeVisible()
  await expect(page.getByText('Amount')).toBeVisible()
  await expect(page.getByText('Fees')).toBeVisible()
  await expect(page.getByText('Total')).toBeVisible()

  expect(await page.getByTestId('Kind').textContent()).toBe('Submarine Swap')
  expect(await page.getByTestId('Direction').textContent()).toBe('Arkade to Lightning')
  expect(await page.getByTestId('Status').textContent()).toBe('transaction.claimed')
  expect(await page.getByTestId('Amount').textContent()).toBe('1,000 SATS')
  expect(await page.getByTestId('Fees').textContent()).toBe('1 SAT')
  expect(await page.getByTestId('Total').textContent()).toBe('1,001 SATS')
})

test('should send funds to Bitcoin', async ({ page, isMobile }) => {
  await createWallet(page)
  await fundWallet(page, 5000)

  const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

  // pay invoice
  await pay(page, someOnchainAddress, isMobile, 2000)

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('Successful')).toBeVisible()
  await expect(page.getByText('Arkade to Bitcoin')).toBeVisible()

  // swap page should show correct details
  await page.getByText('Arkade to Bitcoin').click()
  await expect(page.getByText('When')).toBeVisible()
  await expect(page.getByText('Kind')).toBeVisible()
  await expect(page.getByText('Swap ID')).toBeVisible()
  await expect(page.getByText('Direction')).toBeVisible()
  await expect(page.getByText('Date')).toBeVisible()
  await expect(page.getByText('Status')).toBeVisible()
  await expect(page.getByText('Amount')).toBeVisible()
  await expect(page.getByText('Fees')).toBeVisible()
  await expect(page.getByText('Total')).toBeVisible()

  expect(await page.getByTestId('Kind').textContent()).toBe('Chain Swap')
  expect(await page.getByTestId('Direction').textContent()).toBe('Arkade to BTC')
  expect(await page.getByTestId('Status').textContent()).toBe('transaction.claimed')
  expect(await page.getByTestId('Amount').textContent()).toBe('2,111 SATS')
  expect(await page.getByTestId('Fees').textContent()).toBe('164 SATS')
  expect(await page.getByTestId('Total').textContent()).toBe('2,275 SATS')
})

test('should refund failing swap', async ({ page }) => {
  test.setTimeout(60000)
  await createWallet(page)
  await fundWallet(page, 5000)

  const { stdout } = await execAsync(`docker exec lnd lncli --network=regtest addinvoice --amt 1000`)
  const output = stdout.trim()
  expect(output).toBeDefined()
  expect(output).toBeTruthy()
  const outputJSON = JSON.parse(output)
  expect('payment_request' in outputJSON).toBeTruthy()
  const invoice = outputJSON.payment_request
  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // cancel invoice to make the swap fail
  expect('r_hash' in outputJSON).toBeTruthy()
  const hash = outputJSON.r_hash
  exec(`docker exec lnd lncli --network=regtest cancelinvoice ${hash}`)

  // try to send funds to Lightning
  await page.getByText('Send').click()
  await page.locator('ion-input[name="send-address"] input').fill(invoice)
  await page.getByText('Continue').click()
  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=Swap failed', { timeout: 30000 })
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Boltz')).toBeVisible()
  await page.waitForSelector('text=Refunded', { timeout: 10000 })
  await expect(page.getByText('- 1,001')).toBeVisible()
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
})
