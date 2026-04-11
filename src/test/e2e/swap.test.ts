import {
  test,
  expect,
  createWallet,
  pay,
  receiveLightning,
  receiveOffchain,
  receiveOnchain,
  waitForPaymentReceived,
} from './utils'
import { exec, execSync } from 'child_process'
import { promisify } from 'util'
import { faucetOffchain } from './fundedWallet'

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
  test.setTimeout(60000)
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
  await faucetOffchain(arkAddress, 5000)
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
  await page.waitForSelector('text=- 1,001', { timeout: 10000 })
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
})

test('should refund failing swap', async ({ page }) => {
  test.setTimeout(60000)
  await createWallet(page)

  // get offchain address
  const arkAddress = await receiveOffchain(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()

  // faucet
  await faucetOffchain(arkAddress, 5000)
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
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=Swap failed', { timeout: 30000 })
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('Refunded')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('- 1,001')).toBeVisible()
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
})

test('should receive bitcoin funds from swap', async ({ page, isMobile }) => {
  test.setTimeout(60000)
  // create wallet
  await createWallet(page)

  // get onchain address
  const chainAddress = await receiveOnchain(page, isMobile, 10000)
  expect(chainAddress).toBeDefined()
  expect(chainAddress).toBeTruthy()

  // faucet
  exec(`nigiri faucet ${chainAddress} 0.0001`)

  // wait for payment received
  await waitForPaymentReceived(page)
})

test('should send funds to onchain address via swap', async ({ page, isMobile }) => {
  test.setTimeout(60000)
  // set fees
  execSync('docker exec -t arkd arkd fees intent --onchain-output "200.0"')

  // create wallet
  await createWallet(page)

  // get offchain address
  const arkAddress = await receiveOffchain(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()

  // faucet
  await faucetOffchain(arkAddress, 5000)
  await waitForPaymentReceived(page)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()

  // send page
  const someOnchainAddress = 'bcrt1pxxxth5z4yn8nylc6nzz6w3vkumwdllaky5sls7an8e044u2qlnes2vvy6y'
  await pay(page, someOnchainAddress, isMobile, 2000)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000 SATS')).toBeVisible()
  await expect(page.getByText('Received')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()

  // clear fees
  execSync('docker exec -t arkd arkd fees clear')
})
