import test, { expect } from '@playwright/test'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readClipboard } from './utils'

const execAsync = promisify(exec)

test('should be connected to Boltz app', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('Connection status')).toBeVisible()
  await expect(page.getByText('http://localhost:')).toBeVisible()
  await expect(page.getByText('Connected')).toBeVisible()
  await expect(page.getByText('No swaps yet')).toBeVisible()
})

test('should receive funds from Lightning', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()

  // receive page
  await page.getByText('Receive').click()
  await page.locator('ion-input[name="receive-amount"] input').click()
  if (isMobile) {
    await page.waitForSelector('text=Save', { state: 'visible' })
    await page.getByTestId('keyboard-2').click()
    const btn0 = page.getByTestId('keyboard-0')
    await btn0.click()
    await btn0.click()
    await btn0.click()
    await page.getByText('Save').click()
  } else {
    await page.locator('ion-input[name="receive-amount"] input').fill('2000')
  }
  await page.getByText('Continue').click()

  // copy invoice
  await page
    .locator('div')
    .filter({ hasText: /^Copy address$/ })
    .nth(2)
    .click()
  await expect(page.getByText('Lightning invoice')).toBeVisible()
  await page.locator('svg').nth(6).click() // copy invoice to clipboard
  const invoice = await readClipboard(page)
  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // pay invoice
  exec(`docker exec lnd lncli --network=regtest payinvoice ${invoice} --force`)

  // wait for payment received
  await page.waitForSelector('text=Payment received!')
  await expect(page.getByText('SATS received successfully')).toBeVisible()
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
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()

  // receive page
  await page.getByText('Receive').click()
  await page.getByText('Skip').click()
  await page
    .locator('div')
    .filter({ hasText: /^Copy address$/ })
    .nth(5)
    .click()
  await page.getByRole('img').nth(5).click()
  await page.waitForTimeout(500)
  const arkAddress = await readClipboard(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()
  // faucet
  exec(`docker exec -t arkd ark send --to ${arkAddress} --amount 5000 --password secret`)
  await page.waitForSelector('text=Payment received!')
  await expect(page.getByText('SATS received successfully')).toBeVisible()
  await page.getByTestId('tab-wallet').click()

  // main page
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()
  await page.getByText('Send').click()

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

  // go to send page
  await page.getByText('Send').click()
  await page.getByLabel('', { exact: true }).fill(invoice)
  await page.getByText('Continue').click()
  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=Payment sent!')
  await expect(page.getByText('SATS sent successfully')).toBeVisible()
  await page.getByTestId('tab-wallet').click()

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
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()

  // receive page
  await page.getByText('Receive').click()
  await page.getByText('Skip').click()
  await page
    .locator('div')
    .filter({ hasText: /^Copy address$/ })
    .nth(5)
    .click()
  await page.getByRole('img').nth(5).click()
  await page.waitForTimeout(500)
  const arkAddress = await readClipboard(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()
  // faucet
  exec(`docker exec -t arkd ark send --to ${arkAddress} --amount 5000 --password secret`)
  await page.waitForSelector('text=Payment received!')
  await expect(page.getByText('SATS received successfully')).toBeVisible()
  await page.getByTestId('tab-wallet').click()

  // main page
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()
  await page.getByText('Send').click()

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
  await page.getByLabel('', { exact: true }).fill(invoice)
  await page.getByText('Continue').click()
  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=Swap failed: VHTLC refunded')
  await page.getByTestId('tab-wallet').click()

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('Refunded')).toBeVisible()
  await expect(page.getByText('- 1,001')).toBeVisible()
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
})
