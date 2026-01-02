import { promisify } from 'util'
import { exec } from 'child_process'
import { readClipboard } from './utils'
import { test, expect } from '@playwright/test'

const execAsync = promisify(exec)

// Test to verify that a restored wallet (without Nostr backup) has the correct:
// 1. transaction history
// 2. swap history
//
// Steps:
// 1. Create new wallet
// 2. Perform a reverse swap
// 3. Perform a submarine swap
// 4. Get backup phrase
// 5. Reset wallet
// 6. Restore wallet with backup phrase
// 7. Verify swap history has both swaps

test('should restore swaps without nostr backup', async ({ page, isMobile }) => {
  // start
  await page.goto('/')

  /**
   * 1. create new wallet
   */

  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()
  await page.getByText('Maybe later').click()

  /**
   * 2. reverse swap
   */

  // define amount 2000 SATS
  await page.getByText('Receive', { exact: true }).click()
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
  await page.getByTestId('expand-addresses').click()
  await page.getByTestId('invoice-address-copy').click()
  const invoice = await readClipboard(page)
  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // pay invoice with lnd
  exec(`docker exec lnd lncli --network=regtest payinvoice ${invoice} --force`)

  // wait for payment received
  await page.waitForSelector('text=Payment received!')
  await expect(page.getByText('SATS received successfully')).toBeVisible()

  /**
   * 3. submarine swap
   */

  // create invoice with lnd
  const { stdout } = await execAsync(`docker exec lnd lncli --network=regtest addinvoice --amt 1000`)
  const output = stdout.trim()
  expect(output).toBeDefined()
  expect(output).toBeTruthy()
  const outputJSON = JSON.parse(output)
  expect('payment_request' in outputJSON).toBeTruthy()
  const paymentRequest = outputJSON.payment_request
  expect(paymentRequest).toBeDefined()
  expect(paymentRequest).toBeTruthy()
  expect(paymentRequest).toContain('lnbcrt')
  await page.waitForTimeout(1000)

  // go to send page and pay invoice
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()
  await page.getByLabel('', { exact: true }).fill(paymentRequest)
  await page.getByText('Continue').click()
  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=Payment sent!')
  await expect(page.getByText('SATS sent successfully')).toBeVisible()
  await page.getByTestId('tab-wallet').click()

  /**
   * 4. get nsec
   */

  await page.getByTestId('tab-settings').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('View private key').click()
  await page.getByText('Confirm').click()
  const nsec = await page.getByTestId('private-key').innerText()
  expect(nsec.startsWith('nsec1')).toBe(true)

  /**
   * 5. reset wallet
   */

  await page.getByTestId('tab-settings').click()
  await page.getByText('Reset wallet').click()
  await page.getByText('I have backed up my wallet').click()
  await page.getByRole('contentinfo').getByText('Reset wallet').click()
  await page.waitForTimeout(1000)

  /**
   * 6. restore wallet with nsec
   */

  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('Other login options').click()
  await page.getByText('Restore wallet').click()
  await page.locator('ion-input[name="private-key"] input').fill(nsec)
  await page.getByText('Continue').click()
  await expect(page.getByText('Wallet restored successfully!')).toBeVisible()
  await page.getByText('Go to wallet').click()
  await page.getByText('Maybe later').click()
  await page.waitForTimeout(1000)

  /**
   * 7. verify swap history
   */

  // go to Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await page.waitForTimeout(1000)

  // verify both swaps are present
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('+ 1,992')).toBeVisible()
  await expect(page.getByText('Lightning to Arkade')).toBeVisible()
  await expect(page.getByText('- 1,001')).toBeVisible()
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
})
