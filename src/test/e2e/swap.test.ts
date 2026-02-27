import { test, expect, createWallet, pay, receiveLightning, receiveOffchain, waitForPaymentReceived } from './utils'
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
  exec(`docker exec lnd lncli --network=regtest payinvoice ${invoice} --force`)

  // wait for payment received
  await waitForPaymentReceived(page)
  await page.getByTestId('tab-wallet').click()

  // main page
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
})

test('should send funds to Lightning', async ({ page }) => {
  await createWallet(page)

  // get offchain address
  const arkAddress = await receiveOffchain(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()

  // faucet
  exec(`docker exec -t arkd ark send --to ${arkAddress} --amount 5000 --password secret`)
  await waitForPaymentReceived(page)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()

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
  await expect(page.getByText('- 1,001')).toBeVisible()
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
})

test('should refund failing swap', async ({ page }) => {
  await createWallet(page)

  // get offchain address
  const arkAddress = await receiveOffchain(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()

  // faucet
  exec(`docker exec -t arkd ark send --to ${arkAddress} --amount 5000 --password secret`)
  await waitForPaymentReceived(page)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()

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
  await page.waitForSelector('text=Swap failed')

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('Refunded')).toBeVisible()
  await expect(page.getByText('- 1,001')).toBeVisible()
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
})
